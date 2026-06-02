import 'dotenv/config';
import supabase from '../config/supabaseClient.js';
import { CACHE_DAYS_TIER2, DESTINATION_IATA_CODES, MILLISECONDS_PER_DAY, ORIGIN_IATA_CODES } from '../utils/constants.js';

/** Returns current time as HH:MM:SS for log prefixes. */
const ts = () => new Date().toISOString().slice( 11, 19 );

// this function again because the one in dataHelper is returning 50 dates => 5 weeks , but we need ~13 weeks => 90 days
export function getCronDatesForWeeklyAggregator( tier2Days ) {
    const dates = [];
    const today = new Date();

    for ( let i = 1; i <= tier2Days; i++ ) {
        const d = new Date( today );
        d.setUTCDate( d.getUTCDate() + i );
        dates.push( d.toISOString().slice( 0, 10 ) );
    }

    return dates;
}

function getWeekStartDate( dateStr ) {
    const date        = new Date( dateStr );
    const dayOfWeek   = date.getUTCDay();
    const daysFromMonday = ( dayOfWeek + 6 ) % 7;
    const monday      = new Date( date.getTime() - daysFromMonday * MILLISECONDS_PER_DAY );

    return monday.toISOString().slice( 0, 10 );
}

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

export async function runWeeklyAggregation() {
    const { data: cronRun, error: cronRunErr } = await supabase
        .from( 'cron_runs' )
        .insert( { run_type: 'weekly_agg', started_at: new Date().toISOString() } )
        .select( 'id' )
        .single();

    if ( cronRunErr ) throw new Error( `Failed to insert cron_run: ${cronRunErr.message}` );

    const cronRunId = cronRun.id;

    try {
        const dates = getCronDatesForWeeklyAggregator( CACHE_DAYS_TIER2 );

        const iataToDestinationId     = await fetchDestinationIdMap();
        const destinationIds          = [ ...iataToDestinationId.values() ];
        const destinationIdToHotelIds = await fetchDestinationToHotelIdsMap( destinationIds );
        const allHotelIds             = [ ...destinationIdToHotelIds.values() ].flat();

        if ( allHotelIds.length === 0 ) {
            console.warn( '[weeklyAggregation] No active hotels found — skipping aggregation' );
            await supabase.from( 'cron_runs' ).update( {
                completed_at  : new Date().toISOString(),
                total_jobs    : 0,
                success_count : 0,
                fail_count    : 0,
            } ).eq( 'id', cronRunId );

            return;
        }

        const flightPriceMap = await fetchFlightPriceMap( dates );
        const hotelPriceMap  = await fetchHotelPriceMap( allHotelIds, dates );

        const weeklyBestMap = new Map();

        for ( const date of dates ) {
            const weekStartDate = getWeekStartDate( date );

            for ( const originIata of ORIGIN_IATA_CODES ) {
                for ( const destinationIata of DESTINATION_IATA_CODES ) {
                    const flightKey    = `${date}-${originIata}-${destinationIata}`;
                    const flightRecord = flightPriceMap.get( flightKey );
                    if ( !flightRecord || flightRecord.price === null ) continue;

                    const destinationId = iataToDestinationId.get( destinationIata );
                    const hotelIds      = destinationIdToHotelIds.get( destinationId ) ?? [];

                    let cheapestHotelPrice = null;
                    let cheapestHotelId   = null;

                    hotelIds.forEach( hotelId => {
                        const hotelPrice = hotelPriceMap.get( `${hotelId}-${date}` );
                        if (
                            hotelPrice !== undefined &&
                            hotelPrice !== null &&
                            ( cheapestHotelPrice === null || hotelPrice < cheapestHotelPrice )
                        ) {
                            cheapestHotelPrice = hotelPrice;
                            cheapestHotelId    = hotelId;
                        }
                    } );

                    if ( cheapestHotelPrice === null ) continue;

                    const combinedPrice = flightRecord.price + cheapestHotelPrice;
                    const weekKey       = `${originIata}-${destinationIata}-${weekStartDate}`;
                    const existing      = weeklyBestMap.get( weekKey );

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

        if ( updateErr ) console.error( `[weeklyAggregation] Failed to update cron_run: ${updateErr.message}` );

        console.log( `[weeklyAggregation][${ts()}] Done — ${rowsToUpsert.length} weekly rows upserted` );

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
