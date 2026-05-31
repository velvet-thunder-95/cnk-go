import PQueue from 'p-queue';
import supabase from '../config/supabaseClient.js';
import { searchFlights } from '../clients/tripjack/flightClient.js';
import { getCronDates, getReturnDate, extractTime } from '../utils/dateHelpers.js';
import {
    ORIGIN_IATA_CODES,
    DESTINATION_IATA_CODES,
    CACHE_DAYS_TIER1,
    CACHE_DAYS_TIER2,
    TOP_N_FLIGHTS,
} from '../utils/constants.js';

const MAX_WORKERS = Number( process.env.MAX_CONCURRENT_FLIGHT_WORKERS ) || 3;
// Max requests per second sent to TripJack (sandbox: 2/s, production: raise to 5+)
const REQUESTS_PER_SECOND = Number( process.env.FLIGHT_REQUESTS_PER_SECOND ) || 2;

/** Returns current time as HH:MM:SS for log prefixes. */
const ts = () => new Date().toISOString().slice( 11, 19 );

/**
 * Runs the full flight price cron job.
 * Fetches round-trip prices for all route-date combos, picks top 3 cheapest
 * (preferring different airlines), and upserts into flight_price_cache.
 */
export async function runFlightCron() {
    const startedAt = new Date().toISOString();

    console.log( `[flight-cron][${ts()}] STARTING: Workers=${MAX_WORKERS}, RateLimit=${REQUESTS_PER_SECOND}/s` );

    // Create cron_runs entry
    const { data: cronRun, error: cronErr } = await supabase
        .from( 'cron_runs' )
        .insert( { run_type: 'flights', started_at: startedAt } )
        .select( 'id' )
        .single();

    if ( cronErr ) {
        console.error( '[flight-cron] Failed to create cron_runs entry:', cronErr.message );
        
        return;
    }

    const cronRunId = cronRun.id;
    console.log( `[flight-cron][${ts()}] Started run #${cronRunId} at ${startedAt}` );

    // Generate dates based on tier logic
    const dates = getCronDates( CACHE_DAYS_TIER1, CACHE_DAYS_TIER2 );
    console.log( `[flight-cron][${ts()}] ${dates.length} dates to process` );

    // Generate all jobs — date-first so all routes for a given date are queued
    // together. This ensures the cache fills breadth-first (every route gets
    // at least 1 date populated) rather than depth-first (50 dates for DEL→DXB
    // before BOM→SIN gets a single row).
    const jobs = [];
    for ( const date of dates ) {
        for ( const origin of ORIGIN_IATA_CODES ) {
            for ( const dest of DESTINATION_IATA_CODES ) {
                jobs.push( { origin, dest, date } );
            }
        }
    }

    console.log( `[flight-cron][${ts()}] ${jobs.length} total jobs (${ORIGIN_IATA_CODES.length} origins × ${DESTINATION_IATA_CODES.length} destinations × ${dates.length} dates)` );

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    const queue = new PQueue( {
        concurrency: MAX_WORKERS,
        interval: 1000,                         // rolling 1-second window
        intervalCap: REQUESTS_PER_SECOND,       // max N requests per second
    } );

    const tasks = jobs.map( job =>
        queue.add( () =>
            processFlightJob( job )
                .then( ( skipped ) => { if ( skipped ) skipCount++; else successCount++; } )
                .catch( async ( err ) => {
                    failCount++;
                    console.error( `[flight-cron][${ts()}] FAILED: ${job.origin}->${job.dest} ${job.date} → ${classifyError( err )} — ${err.message?.slice( 0, 120 )}` );
                    await logFailure( cronRunId, job, err );
                } ),
        ),
    );

    await Promise.all( tasks );

    // Update cron_runs with results
    await supabase
        .from( 'cron_runs' )
        .update( {
            completed_at: new Date().toISOString(),
            total_jobs: jobs.length,
            success_count: successCount,
            fail_count: failCount,
        } )
        .eq( 'id', cronRunId );

    const skippedNote = skipCount > 0 ? `, ${skipCount} skipped (bad API response)` : '';
    console.log( `[flight-cron][${ts()}] Completed run #${cronRunId}: ${successCount} success, ${failCount} failed${skippedNote} out of ${jobs.length}` );
}

/**
 * Processes a single flight cron job: search → parse → pick top 3 → upsert.
 */
async function processFlightJob( { origin, dest, date } ) {
    const returnDate = getReturnDate( date );
    const route = `${origin}->${dest} ${date}`;

    // Call TripJack air-search-all (1 adult, economy, round-trip)
    const response = await searchFlights( origin, dest, date, returnDate, { ADULT: 1 } );

    // TripJack sometimes returns HTTP 200 with no searchResult (rate-limited or bad session)
    // instead of a proper 4xx. Skip silently — do NOT delete cached rows in this case.
    const searchResult = response?.searchResult;
    if ( !searchResult ) {
        console.warn( `[flight-cron][${ts()}] ${route} → SKIPPED (API returned no searchResult, keeping cached data)` );
        
        return 'skip';
    }

    // Parse COMBO results (international return always uses COMBO key)
    const combos = searchResult?.tripInfos?.COMBO;

    if ( !combos || combos.length === 0 ) {
        // Confirmed genuine "no flights" for this route-date — safe to clear stale cache
        await supabase
            .from( 'flight_price_cache' )
            .delete()
            .eq( 'origin_iata', origin )
            .eq( 'destination_iata', dest )
            .eq( 'departure_date', date );

        console.log( `[flight-cron][${ts()}] ${route} → EMPTY (API confirmed no flights on this route-date)` );
        
        return;
    }

    // Extract pricing and flight details from each COMBO option
    const parsed = [];

    for ( const combo of combos ) {
        const priceList = combo.totalPriceList;
        if ( !priceList || priceList.length === 0 ) continue;

        const price = priceList[0]?.fd?.ADULT?.fC?.TF;
        if ( !price || price <= 0 ) continue;

        // Separate outbound segments (isRs falsy) from return segments
        const outboundSegs = ( combo.sI || [] ).filter( s => !s.isRs );
        if ( outboundSegs.length === 0 ) continue;

        const firstSeg = outboundSegs[0];
        const lastSeg = outboundSegs[outboundSegs.length - 1];

        // Total stops = connections between segments + intermediate stops within segments
        const connections = outboundSegs.length - 1;
        const intermediateStops = outboundSegs.reduce( ( sum, s ) => sum + ( s.stops || 0 ), 0 );
        const totalStops = connections + intermediateStops;

        // Total outbound duration = sum of segment durations + connection times
        let totalDuration = 0;
        for ( const seg of outboundSegs ) {
            totalDuration += seg.duration || 0;
            totalDuration += seg.cT || 0; // connection time (present on segments after a layover)
        }

        parsed.push( {
            price,
            airline_code: firstSeg.fD?.aI?.code || '',
            airline_name: firstSeg.fD?.aI?.name || '',
            duration_minutes: totalDuration || null,
            stops: totalStops,
            departure_time: extractTime( firstSeg.dt ),
            arrival_time: extractTime( lastSeg.at ),
        } );
    }

    if ( parsed.length === 0 ) {
        await supabase
            .from( 'flight_price_cache' )
            .delete()
            .eq( 'origin_iata', origin )
            .eq( 'destination_iata', dest )
            .eq( 'departure_date', date );

        console.log( `[flight-cron][${ts()}] ${route} → EMPTY (combos had no parseable prices)` );
        
        return;
    }

    // Sort by price ascending
    parsed.sort( ( a, b ) => a.price - b.price );

    // Pick top N, preferring different airlines
    const top = pickTopFlights( parsed, TOP_N_FLIGHTS );

    const now = new Date().toISOString();
    const resultCount = combos.length;

    // Build upsert rows
    const upsertRows = top.map( ( flight, idx ) => ( {
        origin_iata: origin,
        destination_iata: dest,
        departure_date: date,
        return_date: returnDate,
        rank: idx + 1,
        price: flight.price,
        airline_name: flight.airline_name,
        airline_code: flight.airline_code,
        duration_minutes: flight.duration_minutes,
        stops: flight.stops,
        departure_time: flight.departure_time,
        arrival_time: flight.arrival_time,
        result_count: resultCount,
        currency: 'INR',
        fetched_at: now,
    } ) );

    const { error: upsertErr } = await supabase
        .from( 'flight_price_cache' )
        .upsert( upsertRows, { onConflict: 'origin_iata,destination_iata,departure_date,rank' } );

    if ( upsertErr ) {
        throw new Error( `Upsert failed: ${upsertErr.message}` );
    }

    console.log( `[flight-cron][${ts()}] ${route} → WRITTEN (${top.length} ranks, ${resultCount} total results)` );

    // Delete stale ranks if fewer than TOP_N results exist
    if ( top.length < TOP_N_FLIGHTS ) {
        for ( let r = top.length + 1; r <= TOP_N_FLIGHTS; r++ ) {
            const { error: delErr } = await supabase
                .from( 'flight_price_cache' )
                .delete()
                .eq( 'origin_iata', origin )
                .eq( 'destination_iata', dest )
                .eq( 'departure_date', date )
                .eq( 'rank', r );

            if ( !delErr ) {
                console.log( `[flight-cron][${ts()}] ${route} → CLEANUP rank ${r} (stale row removed)` );
            }
        }
    }
}

/**
 * Picks the top N flights, preferring different airlines.
 * First pass: one per unique airline (cheapest for each).
 * Second pass: fill remaining slots with next cheapest regardless of airline.
 */
function pickTopFlights( sorted, n ) {
    const result = [];
    const seenAirlines = new Set();

    // First pass — cheapest from each unique airline
    for ( const flight of sorted ) {
        if ( result.length >= n ) break;
        if ( !seenAirlines.has( flight.airline_code ) ) {
            result.push( flight );
            seenAirlines.add( flight.airline_code );
        }
    }

    // Second pass — fill remaining with next cheapest (allow duplicate airlines)
    if ( result.length < n ) {
        for ( const flight of sorted ) {
            if ( result.length >= n ) break;
            if ( !result.includes( flight ) ) {
                result.push( flight );
            }
        }
    }

    return result;
}

/**
 * Classifies an axios/network error into a short stable code for the
 * error_code column — avoids storing raw HTTP status numbers as 'UNKNOWN'.
 */
function classifyError( err ) {
    if ( err.response?.status ) return String( err.response.status );
    if ( err.message?.includes( 'timeout' ) || err.code === 'ECONNABORTED' ) return 'TIMEOUT';
    if ( err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' ) return 'NETWORK';
    
    return err.code || 'UNKNOWN';
}

/**
 * Logs a failed job to cron_job_failures table.
 */
async function logFailure( cronRunId, job, err ) {
    try {
        await supabase.from( 'cron_job_failures' ).insert( {
            cron_run_id: cronRunId,
            job_type: 'flight',
            job_params: { origin: job.origin, dest: job.dest, date: job.date },
            error_code: classifyError( err ),
            error_message: ( err.message || 'Unknown error' ).slice( 0, 500 ),
        } );
    } catch ( logErr ) {
        console.error( `[flight-cron][${ts()}] Failed to log failure to DB:`, logErr.message );
    }
}
