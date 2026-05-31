import 'dotenv/config';
import supabase from '../config/supabaseClient.js';
import { listHotels } from '../clients/tripjack/hotelClient.js';
import { CACHE_DAYS_TIER1, CACHE_DAYS_TIER2 } from '../utils/constants.js';
import { getCronDates } from '../utils/dateHelpers.js';
import PQueue from 'p-queue';

const BATCH_SIZE = 100;

const ts = () => new Date().toISOString().slice(11, 19);

export async function getHotelData() {
    const { data: hotels, error: hotelErr } = await supabase
        .from('hotels')
        .select('id, tj_hotel_id')
        .eq('is_active', true);

    if (hotelErr) throw hotelErr;

    const tjHotelIdToDbId = new Map();
    for (const hotel of hotels) {
        tjHotelIdToDbId.set(parseInt(hotel.tj_hotel_id), hotel.id);
    }

    const allTjHotelIds = [...tjHotelIdToDbId.keys()];
    const batches = [];
    for (let i = 0; i < allTjHotelIds.length; i += BATCH_SIZE) {
        batches.push(allTjHotelIds.slice(i, i + BATCH_SIZE));
    }

    return { batches, tjHotelIdToDbId };
}

async function getLastFetchedAtPerDate(dates, dbIds) {
    const { data, error } = await supabase
        .from('hotel_price_cache')
        .select('check_in_date, fetched_at')
        .in('hotel_id', dbIds)
        .in('check_in_date', dates);

    if (error) throw error;

    const latest = new Map();
    for (const row of data) {
        const existing = latest.get(row.check_in_date);
        if (!existing || new Date(row.fetched_at) > new Date(existing)) {
            latest.set(row.check_in_date, row.fetched_at);
        }
    }

    return latest;
}

function shouldSkipDate(date, lastFetchedAt) {
    const todayMidnightUTC = new Date();
    todayMidnightUTC.setUTCHours(0, 0, 0, 0);
    const checkInMidnightUTC = new Date(date);
    checkInMidnightUTC.setUTCHours(0, 0, 0, 0);
    const daysFromToday = Math.round((checkInMidnightUTC - todayMidnightUTC) / 86400000);

    if (daysFromToday <= CACHE_DAYS_TIER1) return false;

    if (!lastFetchedAt) return false;

    const hoursSinceLastFetch = (Date.now() - new Date(lastFetchedAt).getTime()) / 3600000;

    return hoursSinceLastFetch < 72;
}

export async function processHotelBatch(batch, checkInDate, checkOutDate, tjHotelIdToDbId, cronRunId, counts) {
    try {
        const data = await listHotels(
            batch,
            checkInDate,
            checkOutDate,
            [{ adults: 2, children: 0 }],
            `cnkgo-cron-${checkInDate}-batch`
        );

        if (data?.status && !data.status.success) {
            throw new Error(data.errors?.[0]?.message || 'Hotel listing failed');
        }

        const hotels        = data.hotels ?? [];
        const returnedTjIds = new Set(hotels.map(h => parseInt(h.hotelId)));

        const unavailableDbIds = batch
            .filter(tjId => !returnedTjIds.has(tjId))
            .map(tjId => tjHotelIdToDbId.get(tjId))
            .filter(Boolean);

        if (unavailableDbIds.length > 0) {
            const { error: delErr } = await supabase
                .from('hotel_price_cache')
                .delete()
                .in('hotel_id', unavailableDbIds)
                .eq('check_in_date', checkInDate);
            if (delErr) throw delErr;
        }

        const rows = hotels
            .filter(h => h.options?.[0]?.pricing?.totalPrice && tjHotelIdToDbId.has(parseInt(h.hotelId)))
            .map(h => ({
                hotel_id        : tjHotelIdToDbId.get(parseInt(h.hotelId)),
                check_in_date   : checkInDate,
                price_per_night : Math.round(h.options[0].pricing.totalPrice * 100) / 100,
                currency        : 'INR',
                fetched_at      : new Date().toISOString(),
            }));

        if (rows.length) {
            const { error: upsertErr } = await supabase
                .from('hotel_price_cache')
                .upsert(rows, { onConflict: 'hotel_id,check_in_date' });
            if (upsertErr) throw upsertErr;
        }

        counts.success++;
        console.log(`[${checkInDate}][${ts()}] upserted: ${rows.length}, unavailable: ${unavailableDbIds.length}`);

    } catch (err) {
        counts.fail++;
        await supabase.from('cron_job_failures').insert({
            cron_run_id   : cronRunId,
            job_type      : 'hotel',
            job_params    : { date: checkInDate, batch_size: batch.length },
            error_message : err.message,
        });
        console.error(`[${checkInDate}][${ts()}] failed: ${err.message}`);
    }
}

export async function runHotelCron() {
    const { data: cronRun, error: cronRunErr } = await supabase
        .from('cron_runs')
        .insert({ run_type: 'hotels', started_at: new Date().toISOString() })
        .select('id')
        .single();
    if (cronRunErr) throw cronRunErr;
    const cronRunId = cronRun.id;

    const dates                        = getCronDates(CACHE_DAYS_TIER1, CACHE_DAYS_TIER2);
    const { batches, tjHotelIdToDbId } = await getHotelData();
    const allDbIds                     = [...tjHotelIdToDbId.values()];
    const lastFetchedPerDate           = await getLastFetchedAtPerDate(dates, allDbIds);
    const counts                       = { success: 0, fail: 0 };
    const queue                        = new PQueue({ concurrency: parseInt(process.env.MAX_CONCURRENT_HOTEL_WORKERS) || 5 });

    let skippedDates = 0;
    let totalJobs    = 0;

    for (const date of dates) {
        if (shouldSkipDate(date, lastFetchedPerDate.get(date))) {
            skippedDates++;
            continue;
        }

        const checkInDate  = date;
        const checkOutObj  = new Date(date);
        checkOutObj.setUTCDate(checkOutObj.getUTCDate() + 1);
        const checkOutDate = checkOutObj.toISOString().slice(0, 10);

        for (const batch of batches) {
            totalJobs++;
            queue.add(async () => {
                await processHotelBatch(batch, checkInDate, checkOutDate, tjHotelIdToDbId, cronRunId, counts);
            });
        }
    }

    await queue.onIdle();

    const { error: updateErr } = await supabase
        .from('cron_runs')
        .update({
            completed_at  : new Date().toISOString(),
            total_jobs    : totalJobs,
            success_count : counts.success,
            fail_count    : counts.fail,
        })
        .eq('id', cronRunId);

    if (updateErr) console.error('[hotelCron] Failed to update cron_run:', updateErr.message);

    console.log(`[hotelCron] Done — ${counts.success}/${totalJobs} succeeded, ${counts.fail} failed, ${skippedDates} dates skipped`);
}