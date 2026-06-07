import 'dotenv/config';
import supabase from '../config/supabaseClient.js';
import {
    CACHE_DAYS_TIER1,
    CACHE_DAYS_TIER2,
    DESTINATION_IATA_CODES,
    ORIGIN_IATA_CODES,
} from '../utils/constants.js';
import { getCronDates, getWeekStart } from '../utils/dateHelpers.js';
import logger from '../logger.js';

/** Returns current time as HH:MM:SS for log prefixes. */
const ts = () => new Date().toISOString().slice( 11, 19 );

/**
 * Fetches a map of destination IATA codes → destination IDs from the DB.
 * @returns {Promise<Map<string, number>>}
 */
async function fetchDestinationIdMap() {
    const { data, error } = await supabase
        .from( 'destinations' )
        .select( 'id, iata_code' )
        .in( 'iata_code', DESTINATION_IATA_CODES );

    if ( error ) throw new Error( `Failed to fetch destinations: ${error.message}` );

    const iataToDestinationId = new Map();
    data.forEach( destination => iataToDestinationId.set( destination.iata_code, destination.id ) );

    return iataToDestinationId;
}

/**
 * Fetches a map of destination ID → array of active hotel IDs for that destination.
 * @param {number[]} destinationIds
 * @returns {Promise<Map<number, number[]>>}
 */
async function fetchDestinationToHotelIdsMap( destinationIds ) {
    const { data, error } = await supabase
        .from( 'hotels' )
        .select( 'id, destination_id' )
        .in( 'destination_id', destinationIds )
        .eq( 'is_active', true );

    if ( error ) throw new Error( `Failed to fetch hotels: ${error.message}` );

    const destinationIdToHotelIds = new Map();
    data.forEach( hotel => {
        const existing = destinationIdToHotelIds.get( hotel.destination_id ) ?? [];
        destinationIdToHotelIds.set( hotel.destination_id, [ ...existing, hotel.id ] );
    } );

    return destinationIdToHotelIds;
}

/**
 * Fetches rank-1 flight prices for the given dates.
 * Returns a Map keyed by `"YYYY-MM-DD-ORIGIN-DEST"`.
 * @param {string[]} dates  YYYY-MM-DD array
 * @returns {Promise<Map<string, { price: number, airlineName: string, airlineCode: string }>>}
 */
async function fetchFlightPriceMap( dates ) {
    const { data, error } = await supabase
        .from( 'flight_price_cache' )
        .select( 'price, origin_iata, destination_iata, departure_date, airline_name, airline_code' )
        .eq( 'rank', 1 )
        .in( 'departure_date', dates );

    if ( error ) throw new Error( `Failed to fetch flight price cache: ${error.message}` );

    const flightPriceMap = new Map();
    data.forEach( row => {
        const key = `${row.departure_date}-${row.origin_iata}-${row.destination_iata}`;
        flightPriceMap.set( key, {
            price       : row.price,
            airlineName : row.airline_name,
            airlineCode : row.airline_code,
        } );
    } );

    return flightPriceMap;
}

/**
 * Fetches hotel prices for the given hotel IDs and dates.
 * Returns a Map keyed by `"hotelId-YYYY-MM-DD"`.
 * @param {number[]} allHotelIds
 * @param {string[]} dates  YYYY-MM-DD array
 * @returns {Promise<Map<string, number>>}
 */
async function fetchHotelPriceMap( allHotelIds, dates ) {
    const { data, error } = await supabase
        .from( 'hotel_price_cache' )
        .select( 'hotel_id, price_per_night, check_in_date' )
        .in( 'hotel_id', allHotelIds )
        .in( 'check_in_date', dates );

    if ( error ) throw new Error( `Failed to fetch hotel price cache: ${error.message}` );

    const hotelPriceMap = new Map();
    data.forEach( row => {
        const key = `${row.hotel_id}-${row.check_in_date}`;
        hotelPriceMap.set( key, row.price_per_night );
    } );

    return hotelPriceMap;
}

/**
 * Runs the weekly price aggregation job.
 *
 * Groups all (origin, destination, date) combinations into Monday-anchored weeks
 * and finds the single day within each week where the combined flight + hotel price
 * is cheapest. Both prices MUST come from the same departure date — never a global
 * minimum from two different days.
 *
 * Uses the same date list as the flight/hotel crons (tier-1 daily + tier-2 every 3 days)
 * so the aggregator only looks at dates that were actually cached.
 */
export async function runWeeklyAggregation() {
    const { data: cronRun, error: cronRunErr } = await supabase
        .from( 'cron_runs' )
        .insert( { run_type: 'weekly_agg', started_at: new Date().toISOString() } )
        .select( 'id' )
        .single();

    if ( cronRunErr ) throw new Error( `Failed to insert cron_run: ${cronRunErr.message}` );

    const cronRunId = cronRun.id;
    logger.info( { cronRunId }, '[weeklyAggregation] Started run' );

    try {
        // Use the same tiered date list as the flight and hotel crons — this ensures
        // we only aggregate dates that were actually fetched and cached.
        const dates = getCronDates( CACHE_DAYS_TIER1, CACHE_DAYS_TIER2 );

        const iataToDestinationId     = await fetchDestinationIdMap();
        const destinationIds          = [ ...iataToDestinationId.values() ];
        const destinationIdToHotelIds = await fetchDestinationToHotelIdsMap( destinationIds );
        const allHotelIds             = [ ...destinationIdToHotelIds.values() ].flat();

        if ( allHotelIds.length === 0 ) {
            logger.warn( '[weeklyAggregation] No active hotels found — skipping aggregation' );
            await supabase.from( 'cron_runs' ).update( {
                completed_at  : new Date().toISOString(),
                total_jobs    : 0,
                success_count : 0,
                fail_count    : 0,
            } ).eq( 'id', cronRunId );

            return;
        }

        logger.info( { datesCount: dates.length, hotelsCount: allHotelIds.length, destinationsCount: destinationIds.length }, '[weeklyAggregation] Found records' );

        const flightPriceMap = await fetchFlightPriceMap( dates );
        const hotelPriceMap  = await fetchHotelPriceMap( allHotelIds, dates );

        // For each (origin, destination, week), find the single day with the cheapest
        // combined flight + hotel price. Both prices must come from the same date.
        const weeklyBestMap = new Map();

        for ( const date of dates ) {
            // getWeekStart returns the Monday of this date's week (YYYY-MM-DD)
            const weekStartDate = getWeekStart( date );

            for ( const originIata of ORIGIN_IATA_CODES ) {
                for ( const destinationIata of DESTINATION_IATA_CODES ) {
                    const flightKey    = `${date}-${originIata}-${destinationIata}`;
                    const flightRecord = flightPriceMap.get( flightKey );
                    // Skip if no rank-1 flight cached for this route-date
                    if ( !flightRecord || flightRecord.price === null ) continue;

                    const destinationId = iataToDestinationId.get( destinationIata );
                    const hotelIds      = destinationIdToHotelIds.get( destinationId ) ?? [];

                    // Find the cheapest hotel available on this exact date (INNER JOIN semantics)
                    let cheapestHotelPrice = null;
                    let cheapestHotelId   = null;

                    for ( const hotelId of hotelIds ) {
                        const hotelPrice = hotelPriceMap.get( `${hotelId}-${date}` );
                        if (
                            hotelPrice !== undefined &&
                            hotelPrice !== null &&
                            ( cheapestHotelPrice === null || hotelPrice < cheapestHotelPrice )
                        ) {
                            cheapestHotelPrice = hotelPrice;
                            cheapestHotelId    = hotelId;
                        }
                    }

                    // No hotel data for this date = skip (equivalent to INNER JOIN in SQL version)
                    if ( cheapestHotelPrice === null ) continue;

                    const combinedPrice = flightRecord.price + cheapestHotelPrice;
                    const weekKey       = `${originIata}-${destinationIata}-${weekStartDate}`;
                    const existing      = weeklyBestMap.get( weekKey );

                    // Keep only the cheapest combined day for this week
                    if ( !existing || combinedPrice < existing.combinedPrice ) {
                        weeklyBestMap.set( weekKey, {
                            originIata,
                            destinationIata,
                            weekStartDate,
                            cheapestDate          : date,
                            minFlightPrice        : flightRecord.price,
                            cheapestHotelPerNight : cheapestHotelPrice,
                            cheapestHotelId,
                            airlineName           : flightRecord.airlineName,
                            airlineCode           : flightRecord.airlineCode,
                            combinedPrice,
                        } );
                    }
                }
            }
        }

        const rowsToUpsert = [ ...weeklyBestMap.values() ].map( entry => ( {
            origin_iata              : entry.originIata,
            destination_iata         : entry.destinationIata,
            week_start_date          : entry.weekStartDate,
            cheapest_date            : entry.cheapestDate,
            min_flight_price         : entry.minFlightPrice,
            cheapest_hotel_per_night : entry.cheapestHotelPerNight,
            cheapest_hotel_id        : entry.cheapestHotelId,
            cheapest_airline_name    : entry.airlineName,
            cheapest_airline_code    : entry.airlineCode,
            currency                 : 'INR',
            computed_at              : new Date().toISOString(),
        } ) );

        if ( rowsToUpsert.length > 0 ) {
            const { error: upsertErr } = await supabase
                .from( 'weekly_price_cache' )
                .upsert( rowsToUpsert, { onConflict: 'origin_iata,destination_iata,week_start_date' } );

            if ( upsertErr ) throw new Error( `Failed to upsert weekly_price_cache: ${upsertErr.message}` );
        }

        const { error: updateErr } = await supabase
            .from( 'cron_runs' )
            .update( {
                completed_at  : new Date().toISOString(),
                total_jobs    : rowsToUpsert.length,
                success_count : rowsToUpsert.length,
                fail_count    : 0,
            } )
            .eq( 'id', cronRunId );

        if ( updateErr ) logger.error( { err: updateErr }, '[weeklyAggregation] Failed to update cron_run' );

        logger.info( { upsertedRows: rowsToUpsert.length }, '[weeklyAggregation] Done' );

    } catch ( err ) {
        await supabase.from( 'cron_runs' ).update( {
            completed_at  : new Date().toISOString(),
            total_jobs    : 0,
            success_count : 0,
            fail_count    : 1,
        } ).eq( 'id', cronRunId );

        throw err;
    }
}
