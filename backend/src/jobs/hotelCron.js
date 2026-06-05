import PQueue from 'p-queue';
import supabase from '../config/supabaseClient.js';
import { listHotels } from '../clients/tripjack/hotelClient.js';
import { CACHE_DAYS_TIER1, CACHE_DAYS_TIER2, TIER2_STEP } from '../utils/constants.js';
import { getCronDates } from '../utils/dateHelpers.js';

/** Returns current time as HH:MM:SS for log prefixes. */
const ts = () => new Date().toISOString().slice( 11, 19 );

const MAX_CONCURRENT_HOTEL_WORKERS =
  parseInt( process.env.MAX_CONCURRENT_HOTEL_WORKERS ) || 5;

const HOTEL_BATCH_SIZE =
  parseInt( process.env.HOTEL_BATCH_SIZE, 10 ) || 100;  

/**
 * Loads all active hotels from the DB and returns:
 *  - tjIdToDbId: Map<tj_hotel_id (string) → db id (number)>
 *  - hotelIdBatches: tj_hotel_id strings split into chunks of HOTEL_BATCH_SIZE
 *
 * @returns {Promise<{ tjIdToDbId: Map<string,number>, hotelIdBatches: string[][] }>}
 */
async function fetchActiveHotels() {
    const { data: activeHotels, error } = await supabase
        .from( 'hotels' )
        .select( 'id, tj_hotel_id' )
        .eq( 'is_active', true );

    if ( error ) throw new Error( `Failed to fetch active hotels: ${error.message}` );

    const tjIdToDbId = new Map();
    for ( const hotel of activeHotels ) {
        tjIdToDbId.set( hotel.tj_hotel_id, hotel.id );
    }

    const allTjHotelIds = [...tjIdToDbId.keys()];

    // Split into batches so a single listing call never exceeds TripJack's
    // undocumented limit; HOTEL_BATCH_SIZE defaults to 100.
    const hotelIdBatches = [];
    for ( let i = 0; i < allTjHotelIds.length; i += HOTEL_BATCH_SIZE ) {
        hotelIdBatches.push( allTjHotelIds.slice( i, i + HOTEL_BATCH_SIZE ) );
    }

    return { tjIdToDbId, hotelIdBatches };
}

// ─── Error Helpers ───────────────────────────────────────────────────────────

/**
 * Derives a short error code string from an axios or generic error.
 *
 * @param {Error} error
 * @returns {string}
 */
function classifyError( error ) {
    if ( error.response?.status ) return String( error.response.status );
    if ( error.message?.includes( 'timeout' ) || error.code === 'ECONNABORTED' ) return 'TIMEOUT';
    if ( error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' ) return 'NETWORK';

    return error.code || 'UNKNOWN';
}

/**
 * Persists a failed job to cron_job_failures for debugging / manual retry.
 *
 * @param {number} cronRunId
 * @param {string} checkInDate  YYYY-MM-DD
 * @param {number} batchSize
 * @param {Error}  error
 */
async function logJobFailure( cronRunId, checkInDate, batchSize, error ) {
    try {
        const { error: insertError } = await supabase
            .from( 'cron_job_failures' )
            .insert( {
                cron_run_id:   cronRunId,
                job_type:      'hotel',
                job_params:    { date: checkInDate, batch_size: batchSize },
                error_code:    classifyError( error ),
                error_message: ( error.message || 'Unknown error' ).slice( 0, 500 ),
            } );

        if ( insertError ) {
            console.error( `[hotel-cron] Failed to log failure to DB: ${insertError.message}` );
        }
    } catch ( loggingError ) {
        console.error( `[hotel-cron] Exception while logging failure: ${loggingError.message}` );
    }
}

// ─── Core Batch Processor ────────────────────────────────────────────────────

/**
 * Fetches live hotel prices for one (batch × date) combination from TripJack,
 * upserts available hotels into hotel_price_cache, and deletes rows for any
 * hotels in the batch that had no availability on that date.
 *
 * @param {string[]}        tjHotelIdBatch  TripJack hotel IDs to query
 * @param {string}          checkInDate     YYYY-MM-DD
 * @param {string}          checkOutDate    YYYY-MM-DD (always checkIn + 1)
 * @param {Map<string,number>} tjIdToDbId   TripJack ID → DB row id
 * @param {number}          cronRunId
 * @param {{ successCount: number, failCount: number }} jobCounts  Mutated in place
 */
async function processHotelBatch(
    tjHotelIdBatch,
    checkInDate,
    checkOutDate,
    tjIdToDbId,
    cronRunId,
    jobCounts
) {
    try {
        const correlationId = `cnkgo-cron-${checkInDate}-batch${tjHotelIdBatch.length}`;

        const listingResponse = await listHotels(
            tjHotelIdBatch,
            checkInDate,
            checkOutDate,
            [{ adults: 2, children: 0 }],
            correlationId
        );

        // TripJack may return a success:false wrapper even on HTTP 200
        if ( listingResponse?.status && !listingResponse.status.success ) {
            throw new Error(
                listingResponse.errors?.[0]?.message || 'Hotel listing API returned failure status'
            );
        }

        const returnedHotels = listingResponse.hotels ?? [];

        // Build a set of TJ hotel IDs that came back with availability
        const availableTjIds = new Set( returnedHotels.map( ( h ) => h.hotelId ) );

        // Any hotel we asked about but got no result = no availability → purge its cache row
        const unavailableDbIds = tjHotelIdBatch
            .filter( ( tjId ) => !availableTjIds.has( tjId ) )
            .map( ( tjId ) => tjIdToDbId.get( tjId ) )
            .filter( Boolean );

        if ( unavailableDbIds.length > 0 ) {
            const { error: deleteError } = await supabase
                .from( 'hotel_price_cache' )
                .delete()
                .in( 'hotel_id', unavailableDbIds )
                .eq( 'check_in_date', checkInDate );

            if ( deleteError ) {
                throw new Error( `Failed to delete unavailable hotel rows: ${deleteError.message}` );
            }
        }

        // Build upsert rows for hotels that have a valid price and are in our DB
        const cacheRows = returnedHotels
            .filter( ( hotel ) => {
                const hasPrice =
                hotel.options?.[0]?.pricing?.totalPrice !== null &&
                    hotel.options?.[0]?.pricing?.totalPrice !== undefined;
                const isKnownHotel = tjIdToDbId.has( hotel.hotelId );

                return hasPrice && isKnownHotel;
            } )
            .map( ( hotel ) => ( {
                hotel_id:        tjIdToDbId.get( hotel.hotelId ),
                check_in_date:   checkInDate,
                // Round to 2 decimal places to avoid floating-point drift in the DB
                price_per_night: Math.round( hotel.options[0].pricing.totalPrice * 100 ) / 100,
                currency:        'INR',
                fetched_at:      new Date().toISOString(),
            } ) );

        if ( cacheRows.length > 0 ) {
            const { error: upsertError } = await supabase
                .from( 'hotel_price_cache' )
                .upsert( cacheRows, { onConflict: 'hotel_id,check_in_date' } );

            if ( upsertError ) {
                throw new Error( `Failed to upsert hotel prices: ${upsertError.message}` );
            }
        }

        jobCounts.successCount++;
        console.log(
            `[hotel-cron][${ts()}] ✓ upserted ${cacheRows.length}, deleted ${unavailableDbIds.length} unavailable`
        );
    } catch ( error ) {
        jobCounts.failCount++;
        await logJobFailure( cronRunId, checkInDate, tjHotelIdBatch.length, error );
        console.error(
            `[hotel-cron][${checkInDate}] ✗ ${classifyError( error )} — ${error.message?.slice( 0, 120 )}`
        );
    }
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Entry point for the nightly hotel price cron.
 *
 * Generates the dates to fetch (tier 1 daily + tier 2 every-3rd-day rotation),
 * then fans out one p-queue job per (date × hotel-batch) combination.
 *
 * Scale reference (all 90 hotels split into 1 batch of 100):
 *   ~30 tier-1 dates + ~20 tier-2 dates = ~50 queue jobs per run
 *   At 5 workers → finishes in roughly 3 minutes.
 */
export async function runHotelCron() {
    const startedAt = new Date().toISOString();

    console.log(
        `[hotel-cron] Starting — workers=${MAX_CONCURRENT_HOTEL_WORKERS}, batchSize=${HOTEL_BATCH_SIZE}`
    );

    // ── Create a cron_runs record so failures can reference it ───────────────
    const { data: cronRunRecord, error: cronRunInsertError } = await supabase
        .from( 'cron_runs' )
        .insert( { run_type: 'hotels', started_at: startedAt } )
        .select( 'id' )
        .single();

    if ( cronRunInsertError ) {
        throw new Error( `Failed to create cron_runs entry: ${cronRunInsertError.message}` );
    }

    const cronRunId = cronRunRecord.id;

    // ── Build date list and hotel data ───────────────────────────────────────
    const checkInDates = getCronDates( CACHE_DAYS_TIER1, CACHE_DAYS_TIER2 );
    const { tjIdToDbId, hotelIdBatches } = await fetchActiveHotels();

    console.log(
        `[hotel-cron] Run #${cronRunId} — ${checkInDates.length} dates to fetch` +
        ` (tier1=${CACHE_DAYS_TIER1}, tier2 step=${TIER2_STEP}), ${hotelIdBatches.length} batch(es), ` +
        `${tjIdToDbId.size} active hotels`
    );

    // ── Enqueue one job per (date × hotel-batch) ─────────────────────────────
    const jobCounts = { successCount: 0, failCount: 0 };
    const queue = new PQueue( { concurrency: MAX_CONCURRENT_HOTEL_WORKERS } );
    let totalJobCount = 0;

    for ( const checkInDate of checkInDates ) {
        // checkOutDate is always checkIn + 1 day (cron fetches 1-night reference price)
        const checkOutDateObj = new Date( checkInDate );
        checkOutDateObj.setUTCDate( checkOutDateObj.getUTCDate() + 1 );
        const checkOutDate = checkOutDateObj.toISOString().slice( 0, 10 );

        for ( const hotelIdBatch of hotelIdBatches ) {
            totalJobCount++;
            queue.add( () =>
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

    // ── Mark the run as complete ──────────────────────────────────────────────
    const { error: updateError } = await supabase
        .from( 'cron_runs' )
        .update( {
            completed_at:  new Date().toISOString(),
            total_jobs:    totalJobCount,
            success_count: jobCounts.successCount,
            fail_count:    jobCounts.failCount,
        } )
        .eq( 'id', cronRunId );

    if ( updateError ) {
        console.error( `[hotel-cron] Failed to update cron_runs record: ${updateError.message}` );
    }

    console.log(
        `[hotel-cron] Completed run #${cronRunId}: ` +
        `${jobCounts.successCount}/${totalJobCount} succeeded, ${jobCounts.failCount} failed`
    );
}