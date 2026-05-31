import 'dotenv/config';
import PQueue from 'p-queue';
import supabase from '../config/supabaseClient.js';
import { listHotels } from '../clients/tripjack/hotelClient.js';
import { getCronDates } from '../utils/dateHelpers.js';
import { CACHE_DAYS_TIER1, CACHE_DAYS_TIER2, MILLISECONDS_PER_DAY, MILLISECONDS_PER_HOUR, TIER_2_FRESHNESS_HOURS } from '../utils/constants.js';

const HOTEL_BATCH_SIZE = process.env.BATCH_SIZE
    ? parseInt(process.env.BATCH_SIZE, 10)
    : 100;

const MAX_CONCURRENT_HOTEL_WORKERS =
  parseInt(process.env.MAX_CONCURRENT_HOTEL_WORKERS, 10) || 5;

function currentTimestamp() {
    return new Date().toISOString().slice(11, 19);
}

async function fetchActiveHotels() {
    const { data: activeHotels, error: activeHotelsError } = await supabase
        .from('hotels')
        .select('id, tj_hotel_id')
        .eq('is_active', true);

    if (activeHotelsError) {
        throw new Error(
            `Failed to fetch active hotels: ${activeHotelsError.message}`
        );
    }

    const tjIdToDbId = new Map();
    for (const hotel of activeHotels) {
        tjIdToDbId.set(hotel.tj_hotel_id, hotel.id);
    }

    const allTjHotelIds = [...tjIdToDbId.keys()];

    const hotelIdBatches = [];
    for (
        let batchStart = 0;
        batchStart < allTjHotelIds.length;
        batchStart += HOTEL_BATCH_SIZE
    ) {
        hotelIdBatches.push(
            allTjHotelIds.slice(batchStart, batchStart + HOTEL_BATCH_SIZE)
        );
    }

    return { hotelIdBatches, tjIdToDbId };
}

async function fetchLatestFetchedTimestamps(checkInDates, databaseHotelIds) {
    const { data: cachedRows, error: cachedRowsError } = await supabase
        .from('hotel_price_cache')
        .select('check_in_date, fetched_at')
        .in('hotel_id', databaseHotelIds)
        .in('check_in_date', checkInDates);

    if (cachedRowsError) {
        throw new Error(
            `Failed to fetch cached timestamps: ${cachedRowsError.message}`
        );
    }

    const latestFetchedAtPerDate = new Map();
    for (const row of cachedRows) {
        const existingTimestamp = latestFetchedAtPerDate.get(row.check_in_date);
        if (
            !existingTimestamp ||
      new Date(row.fetched_at) > new Date(existingTimestamp)
        ) {
            latestFetchedAtPerDate.set(row.check_in_date, row.fetched_at);
        }
    }

    return latestFetchedAtPerDate;
}

function shouldSkipTierTwoDate(checkInDate, lastFetchedAt) {
    const todayMidnightUtc = new Date();
    todayMidnightUtc.setUTCHours(0, 0, 0, 0);

    const checkInMidnightUtc = new Date(checkInDate);
    checkInMidnightUtc.setUTCHours(0, 0, 0, 0);

    const daysFromToday = Math.round(
        (checkInMidnightUtc - todayMidnightUtc) / MILLISECONDS_PER_DAY
    );

    if (daysFromToday <= CACHE_DAYS_TIER1) {
        return false;
    }

    if (!lastFetchedAt) {
        return false;
    }

    const hoursSinceLastFetch =
    (Date.now() - new Date(lastFetchedAt).getTime()) / MILLISECONDS_PER_HOUR;

    return hoursSinceLastFetch < TIER_2_FRESHNESS_HOURS;
}

function classifyError(error) {
    if (error.response?.status) return String(error.response.status);
    if (error.message?.includes('timeout') || error.code === 'ECONNABORTED')
        return 'TIMEOUT';
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED')
        return 'NETWORK';
    
    return error.code || 'UNKNOWN';
}

async function logJobFailure(cronRunId, checkInDate, batchSize, error) {
    try {
        const { error: insertError } = await supabase
            .from('cron_job_failures')
            .insert({
                cron_run_id: cronRunId,
                job_type: 'hotel',
                job_params: { date: checkInDate, batch_size: batchSize },
                error_code: classifyError(error),
                error_message: (error.message || 'Unknown error').slice(0, 500),
            });

        if (insertError) {
            console.error(
                `[hotel-cron][${currentTimestamp()}] Failed to log failure to DB: ${insertError.message}`
            );
        }
    } catch (loggingError) {
        console.error(
            `[hotel-cron][${currentTimestamp()}] Failed to log failure to DB: ${loggingError.message}`
        );
    }
}

async function processHotelBatch(
    tjHotelIdBatch,
    checkInDate,
    checkOutDate,
    tjIdToDbId,
    cronRunId,
    jobCounts
) {
    try {
        const correlationId = `cnkgo-cron-${checkInDate}-${tjHotelIdBatch.length}`;

        const listingResponse = await listHotels(
            tjHotelIdBatch,
            checkInDate,
            checkOutDate,
            [{ adults: 2, children: 1 }],
            correlationId
        );

        if (listingResponse?.status && !listingResponse.status.success) {
            throw new Error(
                listingResponse.errors?.[0]?.message || 'Hotel listing API failed'
            );
        }

        const returnedHotels = listingResponse.hotels ?? [];
        const returnedTripjackIds = new Set(
            returnedHotels.map((hotel) => hotel.hotelId)
        );

        const unavailableDbIds = tjHotelIdBatch
            .filter(
                (tripjackHotelId) => !returnedTripjackIds.has(tripjackHotelId)
            )
            .map((tripjackHotelId) => tjIdToDbId.get(tripjackHotelId))
            .filter(Boolean);

        if (unavailableDbIds.length > 0) {
            const { error: deleteError } = await supabase
                .from('hotel_price_cache')
                .delete()
                .in('hotel_id', unavailableDbIds)
                .eq('check_in_date', checkInDate);

            if (deleteError) {
                throw new Error(
                    `Failed to delete unavailable hotels: ${deleteError.message}`
                );
            }
        }

        const cacheRows = returnedHotels
            .filter(
                (hotel) =>
                    hotel.options?.[0]?.pricing?.totalPrice !== null &&
                hotel.options?.[0]?.pricing?.totalPrice !== undefined &&
          tjIdToDbId.has(hotel.hotelId)
            )
            .map((hotel) => ({
                hotel_id: tjIdToDbId.get(hotel.hotelId),
                check_in_date: checkInDate,
                price_per_night: Math.round(hotel.options[0].pricing.totalPrice * 100) / 100,
                currency: 'INR',
                fetched_at: new Date().toISOString(),
            }));

        if (cacheRows.length > 0) {
            const { error: upsertError } = await supabase
                .from('hotel_price_cache')
                .upsert(cacheRows, { onConflict: 'hotel_id,check_in_date' });

            if (upsertError) {
                throw new Error(`Failed to upsert hotel prices: ${upsertError.message}`);
            }
        }

        jobCounts.successCount++;

        console.log(
            `[hotel-cron][${currentTimestamp()}][${checkInDate}] Upserted ${cacheRows.length} prices, deleted ${unavailableDbIds.length} unavailable`
        );
    } catch (error) {
        jobCounts.failCount++;
        await logJobFailure(
            cronRunId,
            checkInDate,
            tjHotelIdBatch.length,
            error
        );
        console.error(
            `[hotel-cron][${currentTimestamp()}][${checkInDate}] ${classifyError(error)} — ${error.message?.slice(0, 120)}`
        );
    }
}

export async function runHotelCron() {
    const startedAt = new Date().toISOString();

    console.log(
        `[hotel-cron][${currentTimestamp()}] Starting hotel cron — workers=${MAX_CONCURRENT_HOTEL_WORKERS}, batchSize=${HOTEL_BATCH_SIZE}`
    );

    const { data: cronRunRecord, error: cronRunInsertError } = await supabase
        .from('cron_runs')
        .insert({ run_type: 'hotels', started_at: startedAt })
        .select('id')
        .single();

    if (cronRunInsertError) {
        throw new Error(
            `Failed to create cron_runs entry: ${cronRunInsertError.message}`
        );
    }

    const cronRunId = cronRunRecord.id;
    const checkInDates = getCronDates(CACHE_DAYS_TIER1, CACHE_DAYS_TIER2);
    const { hotelIdBatches, tjIdToDbId } = await fetchActiveHotels();
    const allDatabaseHotelIds = [...tjIdToDbId.values()];
    const latestFetchedAtPerDate = await fetchLatestFetchedTimestamps(
        checkInDates,
        allDatabaseHotelIds
    );

    const jobCounts = { successCount: 0, failCount: 0 };
    const queue = new PQueue({ concurrency: MAX_CONCURRENT_HOTEL_WORKERS });
    let skippedDateCount = 0;
    let totalJobCount = 0;

    console.log(
        `[hotel-cron][${currentTimestamp()}] Run #${cronRunId} — ${checkInDates.length} dates, ${hotelIdBatches.length} batches per date, ${allDatabaseHotelIds.length} active hotels`
    );

    for (const checkInDate of checkInDates) {
        if (
            shouldSkipTierTwoDate(
                checkInDate,
                latestFetchedAtPerDate.get(checkInDate)
            )
        ) {
            skippedDateCount++;
            continue;
        }

        const checkOutDateObject = new Date(checkInDate);
        checkOutDateObject.setUTCDate(checkOutDateObject.getUTCDate() + 1);
        const checkOutDate = checkOutDateObject.toISOString().slice(0, 10);

        for (const hotelIdBatch of hotelIdBatches) {
            totalJobCount++;
            queue.add(() =>
                processHotelBatch(
                    hotelIdBatch,
                    checkInDate,
                    checkOutDate,
                    tjIdToDbId,
                    cronRunId,
                    jobCounts
                )
            );
        }
    }

    await queue.onIdle();

    const { error: cronRunUpdateError } = await supabase
        .from('cron_runs')
        .update({
            completed_at: new Date().toISOString(),
            total_jobs: totalJobCount,
            success_count: jobCounts.successCount,
            fail_count: jobCounts.failCount,
        })
        .eq('id', cronRunId);

    if (cronRunUpdateError) {
        console.error(
            `[hotel-cron][${currentTimestamp()}] Failed to update cron_runs: ${cronRunUpdateError.message}`
        );
    }

    console.log(
        `[hotel-cron][${currentTimestamp()}] Completed run #${cronRunId}: ${jobCounts.successCount}/${totalJobCount} succeeded, ${jobCounts.failCount} failed, ${skippedDateCount} dates skipped`
    );
}
