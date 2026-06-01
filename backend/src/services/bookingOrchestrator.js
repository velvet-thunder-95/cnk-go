import supabase from '../config/supabaseClient.js';
import * as flightClient from '../clients/tripjack/flightClient.js';
import * as hotelClient from '../clients/tripjack/hotelClient.js';
import { generateCorrelationId } from '../utils/priceCalculator.js';

// ─── Passenger Transformers ───────────────────────────────────────────────────

/** Maps our stored title values to TripJack-supported passenger titles. */
const TITLE_TO_TJ_TITLE = {
    Mr: 'Mr', Mrs: 'Mrs', Ms: 'Ms', Miss: 'Miss', Master: 'Master', Dr: 'Mr',
};

const HOTEL_DETAILS_POLL_ATTEMPTS = 3;
const HOTEL_DETAILS_POLL_DELAY_MS = 2000;
const TRANSIENT_HOTEL_STATUSES = new Set( [ 'BOOK_REQUESTED', 'PAYMENT_SUCCESS' ] );

/**
 * Transform a DB booking_passengers row into a TripJack flight travellerInfo object.
 * IMPORTANT: Do NOT include the `pid` field — TripJack rejects it at book time.
 *
 * @param {object} p  - Row from booking_passengers table
 * @returns {object}  - TripJack travellerInfo shape
 */
function toFlightTraveller( p ) {
    const traveller = {
        ti: TITLE_TO_TJ_TITLE[ p.title ] ?? p.title,
        fN: p.first_name,
        lN: p.last_name,
        pt: p.pax_type.toUpperCase(),
        dob: p.date_of_birth,
    };

    if ( p.passport_number ) {
        traveller.pNum = p.passport_number;
        traveller.pNat = p.nationality;
    }
    if ( p.passport_expiry ) traveller.eD  = p.passport_expiry;
    if ( p.pan_number      ) traveller.pan = p.pan_number;

    return traveller;
}

function buildDeliveryInfo( passengers ) {
    const leadPassenger = passengers.find( p => p.is_lead ) ?? passengers[ 0 ];
    const email = leadPassenger?.email;
    const phone = leadPassenger?.phone;
    const rawCode = leadPassenger?.phone_country_code || '+91';
    const phoneCode = rawCode.startsWith( '+' ) ? rawCode : `+${rawCode}`;

    if ( !email || !phone ) {
        return null;
    }

    return {
        hotel: {
            emails: [ email ],
            contacts: [ phone ],
            code: [ phoneCode ],
        },
        flight: {
            emails: [ email ],
            contacts: [ `${phoneCode}${phone}` ],
        },
    };
}

/**
 * Build TripJack hotel roomTravellerInfo from the frontend-selected room config.
 * Adult and child counts come from booking.room_config, so we never guess room count.
 *
 * @param {object[]} passengers  - Rows from booking_passengers table
 * @param {object[]} roomConfig  - Persisted rooms[] from frontend/TripJack search
 * @returns {object[]}           - TripJack roomTravellerInfo array
 */
function toHotelRoomTravellers( passengers, roomConfig ) {
    const byLeadFirst = ( a, b ) => ( b.is_lead ? 1 : 0 ) - ( a.is_lead ? 1 : 0 );
    const adultQueue = passengers
        .filter( p => p.pax_type === 'adult' )
        .sort( byLeadFirst );
    const childQueue = passengers.filter( p => p.pax_type === 'child' );

    return roomConfig.map( room => {
        const roomPassengers = [
            ...adultQueue.splice( 0, room.adults ),
            ...childQueue.splice( 0, room.children ?? 0 ),
        ];

        return {
            travellerInfo: roomPassengers.map( p => {
                const traveller = {
                    ti: TITLE_TO_TJ_TITLE[ p.title ] ?? p.title,
                    fN: p.first_name,
                    lN: p.last_name,
                    pt: p.pax_type.toUpperCase(),
                };

                if ( p.pan_number      ) traveller.pan  = p.pan_number;
                if ( p.passport_number ) traveller.pNum = p.passport_number;

                return traveller;
            } ),
        };
    } );
}

function getProviderError( data, fallback ) {
    return data?.errors?.[ 0 ]?.message ?? data?.status?.message ?? fallback;
}

function isProviderFailure( data ) {
    return data?.status && data.status.success === false;
}

function extractFlightPnr( bookingDetails ) {
    const travellerInfos = bookingDetails?.itemInfos?.AIR?.travellerInfos ?? [];

    for ( const traveller of travellerInfos ) {
        const pnrDetails = traveller?.pnrDetails;
        if ( !pnrDetails || typeof pnrDetails !== 'object' ) continue;

        const pnr = Object.values( pnrDetails )
            .find( value => typeof value === 'string' && value.trim() );

        if ( pnr ) return pnr;
    }

    return null;
}

function wait( ms ) {
    return new Promise( resolve => setTimeout( resolve, ms ) );
}

function selectHotelOption( options, hotelOptionId ) {
    if ( !Array.isArray( options ) || options.length === 0 ) return null;

    if ( hotelOptionId ) {
        const selected = options.find( option => option.optionId === hotelOptionId );
        if ( selected ) return selected;
    }

    return [ ...options ].sort(
        ( a, b ) => Number( a.pricing?.totalPrice ?? Infinity ) - Number( b.pricing?.totalPrice ?? Infinity ),
    )[ 0 ];
}

function getFlightFareTotal( priceEntry, booking ) {
    const adultFare = Number( priceEntry?.fd?.ADULT?.fC?.TF ?? 0 );
    const childFare = Number( priceEntry?.fd?.CHILD?.fC?.TF ?? 0 );

    return ( adultFare * booking.adults ) + ( childFare * booking.children );
}

function selectFlightOption( searchData, booking, flightAirlineCode ) {
    const tripInfos = Object.values( searchData?.searchResult?.tripInfos ?? {} )
        .flatMap( value => Array.isArray( value ) ? value : [] );

    const options = [];

    for ( const tripInfo of tripInfos ) {
        const airlineCode = tripInfo.sI?.[ 0 ]?.fD?.aI?.code;
        const airlineName = tripInfo.sI?.[ 0 ]?.fD?.aI?.name;

        for ( const priceEntry of tripInfo.totalPriceList ?? [] ) {
            if ( !priceEntry?.id ) continue;

            options.push( {
                priceId: priceEntry.id,
                airlineCode,
                airlineName,
                total: getFlightFareTotal( priceEntry, booking ),
            } );
        }
    }

    if ( !options.length ) return null;

    const preferredOptions = flightAirlineCode
        ? options.filter( option => option.airlineCode === flightAirlineCode.toUpperCase() )
        : [];

    return ( preferredOptions.length ? preferredOptions : options )
        .sort( ( a, b ) => a.total - b.total )[ 0 ];
}

// ─── DB State Machine ─────────────────────────────────────────────────────────

/**
 * Persist a partial update to the bookings row.
 * Failures here are logged but do not throw — the booking state is best-effort
 * at this point (the external API calls are the source of truth).
 *
 * @param {number} bookingId
 * @param {object} fields
 */
async function updateBooking( bookingId, fields ) {
    const { error } = await supabase
        .from( 'bookings' )
        .update( { ...fields, updated_at: new Date().toISOString() } )
        .eq( 'id', bookingId );

    if ( error ) {
        console.error( `[orchestrator] DB update failed for booking #${bookingId}:`, error.message );
    }
}

async function getHotelBookingDetailsSafely( bookingId, tjHotelBookingId ) {
    let latestDetails = null;

    for ( let attempt = 1; attempt <= HOTEL_DETAILS_POLL_ATTEMPTS; attempt++ ) {
        try {
            latestDetails = await hotelClient.getHotelBookingDetails( tjHotelBookingId );

            const hotelStatus = latestDetails?.order?.status;
            if ( hotelStatus && !TRANSIENT_HOTEL_STATUSES.has( hotelStatus ) ) {
                return latestDetails;
            }
        } catch ( err ) {
            console.error(
                `[orchestrator] Hotel booking-details failed for #${bookingId} / ${tjHotelBookingId}:`,
                err.response?.data?.errors?.[ 0 ]?.message ?? err.message,
            );
        }

        if ( attempt < HOTEL_DETAILS_POLL_ATTEMPTS ) {
            await wait( HOTEL_DETAILS_POLL_DELAY_MS );
        }
    }

    return latestDetails;
}

async function getFlightBookingDetailsSafely( bookingId, flightBookingId ) {
    try {
        return await flightClient.getFlightBookingDetails( flightBookingId );
    } catch ( err ) {
        console.error(
            `[orchestrator] Flight booking-details failed for #${bookingId} / ${flightBookingId}:`,
            err.response?.data?.errors?.[ 0 ]?.message ?? err.message,
        );

        return null;
    }
}

// ─── Live Review / Price Lock ────────────────────────────────────────────────

/**
 * Create short-lived TripJack booking tokens only after passenger details exist.
 * This powers the final confirmation screen: current hotel price + current flight
 * fare are reviewed live and saved on the booking row for immediate confirmation.
 *
 * @param {object} params
 * @param {object} params.booking
 * @param {string} [params.hotelOptionId]      Optional current hotel option preference
 * @param {string} [params.flightAirlineCode]  Optional preferred airline from cached selection
 * @returns {Promise<{ success: boolean, error?: string, review?: object }>}
 */
export async function reviewPackageBooking( { booking, hotelOptionId, flightAirlineCode } ) {
    const roomConfig = booking.room_config;

    if ( !booking.hotel_id ) {
        return { success: false, error: 'hotel_id is required before review' };
    }
    if ( !Array.isArray( roomConfig ) || roomConfig.length === 0 ) {
        return { success: false, error: 'Booking room_config is missing. Recreate the booking with rooms[] from the frontend.' };
    }

    const { data: hotel, error: hotelLookupErr } = await supabase
        .from( 'hotels' )
        .select( 'tj_hotel_id, name' )
        .eq( 'id', booking.hotel_id )
        .single();

    if ( hotelLookupErr || !hotel ) {
        return { success: false, error: 'Selected hotel was not found' };
    }

    const correlationId = generateCorrelationId( booking.id );

    const hotelPricing = await hotelClient.priceHotel(
        hotel.tj_hotel_id,
        booking.departure_date,
        booking.return_date,
        roomConfig,
        correlationId,
    );

    if ( isProviderFailure( hotelPricing ) ) {
        await updateBooking( booking.id, { status: 'review_failed' } );

        return { success: false, error: getProviderError( hotelPricing, 'Hotel pricing failed at provider' ) };
    }

    const hotelOption = selectHotelOption( hotelPricing.options, hotelOptionId );
    if ( !hotelOption ) {
        await updateBooking( booking.id, { status: 'review_failed' } );

        return { success: false, error: 'No hotel option is available for the selected room configuration' };
    }

    const hotelReview = await hotelClient.reviewHotel(
        hotelOption.optionId,
        hotelPricing.reviewHash,
        hotel.tj_hotel_id,
        correlationId,
    );

    if ( isProviderFailure( hotelReview ) ) {
        await updateBooking( booking.id, { status: 'review_failed' } );

        return { success: false, error: getProviderError( hotelReview, 'Hotel review failed at provider' ) };
    }

    const hotelAmount = Number( hotelReview.option?.pricing?.totalPrice ?? hotelOption.pricing?.totalPrice );

    const flightSearch = await flightClient.searchFlights(
        booking.origin_iata,
        booking.destination_iata,
        booking.departure_date,
        booking.return_date,
        { ADULT: booking.adults, CHILD: booking.children },
    );

    if ( isProviderFailure( flightSearch ) ) {
        await updateBooking( booking.id, { status: 'review_failed' } );

        return { success: false, error: getProviderError( flightSearch, 'Flight search failed at provider' ) };
    }

    const flightOption = selectFlightOption( flightSearch, booking, flightAirlineCode );
    if ( !flightOption ) {
        await updateBooking( booking.id, { status: 'review_failed' } );

        return { success: false, error: 'No flight option is available for this package' };
    }

    const flightReview = await flightClient.reviewFlight( flightOption.priceId );

    if ( isProviderFailure( flightReview ) ) {
        await updateBooking( booking.id, { status: 'review_failed' } );

        return { success: false, error: getProviderError( flightReview, 'Flight review failed at provider' ) };
    }

    const flightAmount = Number(
        flightReview.totalPriceInfo?.totalFareDetail?.fC?.TF ?? flightOption.total,
    );

    await updateBooking( booking.id, {
        status: 'reviewed',
        tj_hotel_booking_id: hotelReview.bookingId,
        tj_hotel_booking_status: 'REVIEWED',
        hotel_cancellation_policy: hotelReview.option?.cancellation ?? hotelOption.cancellation ?? null,
        hotel_amount: hotelAmount,
        hotel_status: 'REVIEWED',
        flight_booking_id: flightReview.bookingId,
        flight_status: 'REVIEWED',
        flight_amount: flightAmount,
        total_amount: hotelAmount + flightAmount,
    } );

    return {
        success: true,
        review: {
            booking_id: booking.id,
            status: 'reviewed',
            hotel: {
                name: hotel.name,
                booking_id: hotelReview.bookingId,
                amount: hotelAmount,
                price_changed: hotelReview.priceChanged ?? false,
                onhold_allowed: hotelReview.onholdAllowed ?? false,
                deadline: hotelReview.option?.deadlineDateTime ?? null,
                option_id: hotelReview.option?.optionId ?? hotelOption.optionId,
                cancellation: hotelReview.option?.cancellation ?? hotelOption.cancellation ?? null,
            },
            flight: {
                booking_id: flightReview.bookingId,
                amount: flightAmount,
                airline_code: flightOption.airlineCode,
                airline_name: flightOption.airlineName,
                session_ttl_seconds: flightReview.conditions?.st ?? null,
                alerts: flightReview.alerts ?? [],
            },
            total_amount: hotelAmount + flightAmount,
            currency: 'INR',
        },
    };
}

// ─── Core Orchestrator ────────────────────────────────────────────────────────

/**
 * Orchestrate the hotel → flight booking sequence for a single package booking.
 *
 * **Hotel is always booked first** because a hotel cancellation API exists in TripJack.
 * If the subsequent flight booking fails, the hotel is automatically cancelled and
 * the booking is marked as 'failed'. This prevents leaving customers with a hotel
 * booking and no flight.
 *
 * State transitions:
 *   reviewed → hotel_booked → confirmed
 *   reviewed → hotel_failed
 *   hotel_booked → cancelled     (flight failed; hotel cancelled)
 *   hotel_booked → flight_failed (flight failed; hotel cancel failed)
 *
 * @param {object} params
 * @param {object}   params.booking          - Full bookings DB row
 * @param {object[]} params.passengers       - booking_passengers DB rows for this booking
 *
 * @returns {Promise<{ success: boolean, error?: string, booking?: object }>}
 */
export async function orchestrateBooking( {
    booking,
    passengers,
} ) {
    const bookingId = booking.id;
    const roomConfig = booking.room_config;
    const hotelBookingId = booking.tj_hotel_booking_id;
    const hotelAmount = Number( booking.hotel_amount );
    const flightBookingId = booking.flight_booking_id;
    const flightAmount = Number( booking.flight_amount );

    if ( !Array.isArray( roomConfig ) || roomConfig.length === 0 ) {
        return { success: false, error: 'Booking room_config is missing. Recreate the booking with rooms[] from the frontend.' };
    }
    if ( !hotelBookingId || !flightBookingId || Number.isNaN( hotelAmount ) || Number.isNaN( flightAmount ) ) {
        return { success: false, error: 'Booking must be reviewed before it can be confirmed' };
    }

    const delivery = buildDeliveryInfo( passengers );
    if ( !delivery ) {
        return { success: false, error: 'Lead passenger email and phone are required for TripJack booking delivery' };
    }

    // ── Step 1: Book Hotel ────────────────────────────────────────────────────
    const roomTravellers = toHotelRoomTravellers( passengers, roomConfig );

    let hotelResult;
    try {
        hotelResult = await hotelClient.bookHotel(
            hotelBookingId,
            roomTravellers,
            delivery.hotel,
            hotelAmount,
        );
    } catch ( err ) {
        const msg = err.response?.data?.errors?.[ 0 ]?.message ?? err.message ?? 'Hotel booking failed';
        console.error( `[orchestrator] Hotel booking threw for #${bookingId}:`, msg );
        await updateBooking( bookingId, { status: 'hotel_failed', hotel_status: 'FAILED' } );
        
        return { success: false, error: `Hotel booking failed: ${msg}` };
    }

    if ( hotelResult?.status && !hotelResult.status.success ) {
        const msg = hotelResult.errors?.[ 0 ]?.message ?? 'Hotel booking rejected by provider';
        await updateBooking( bookingId, { status: 'hotel_failed', hotel_status: 'FAILED' } );
        
        return { success: false, error: `Hotel booking failed: ${msg}` };
    }

    const tjHotelBookingId = hotelResult.bookingId ?? hotelResult.order?.bookingId ?? hotelBookingId;
    const hotelDetails = await getHotelBookingDetailsSafely( bookingId, tjHotelBookingId );
    const confirmedHotelBookingId = hotelDetails?.order?.bookingId ?? tjHotelBookingId;
    const hotelStatus = hotelDetails?.order?.status ?? hotelResult.order?.status ?? 'BOOK_REQUESTED';

    await updateBooking( bookingId, {
        status: 'hotel_booked',
        tj_hotel_booking_id: confirmedHotelBookingId,
        tj_hotel_booking_status: hotelStatus,
        hotel_status: hotelStatus,
        hotel_amount: hotelAmount,
        hotel_booked_at: new Date().toISOString(),
    } );

    console.log( `[orchestrator] Hotel booked for #${bookingId} → TJ ID: ${confirmedHotelBookingId}` );

    // ── Step 2: Book Flight ───────────────────────────────────────────────────
    const flightTravellers = passengers.map( toFlightTraveller );

    let flightResult;
    try {
        flightResult = await flightClient.bookFlight(
            flightBookingId,
            flightAmount,
            flightTravellers,
            delivery.flight,
        );
    } catch ( err ) {
        const msg = err.response?.data?.errors?.[ 0 ]?.message ?? err.message ?? 'Flight booking failed';
        console.error( `[orchestrator] Flight booking threw for #${bookingId}:`, msg );
        await _cancelHotelSafely( bookingId, tjHotelBookingId );
        
        return { success: false, error: `Flight booking failed: ${msg}` };
    }

    if ( flightResult?.status && !flightResult.status.success ) {
        const msg = flightResult.errors?.[ 0 ]?.message ?? 'Flight booking rejected by provider';
        console.error( `[orchestrator] Flight rejected for #${bookingId}:`, msg );
        await _cancelHotelSafely( bookingId, tjHotelBookingId );
        
        return { success: false, error: `Flight booking failed: ${msg}` };
    }

    // ── Step 3: Mark Confirmed ────────────────────────────────────────────────
    const confirmedFlightBookingId = flightResult.bookingId ?? flightResult.order?.bookingId ?? flightBookingId;
    const flightDetails = await getFlightBookingDetailsSafely( bookingId, confirmedFlightBookingId );
    const flightStatus = flightDetails?.order?.status ?? flightResult.order?.status ?? 'BOOK_REQUESTED';
    const flightPnr = extractFlightPnr( flightDetails );

    await updateBooking( bookingId, {
        status: 'confirmed',
        flight_booking_id: confirmedFlightBookingId,
        flight_pnr: flightPnr,
        flight_status: flightStatus,
        flight_amount: flightAmount,
        flight_booked_at: new Date().toISOString(),
        total_amount: hotelAmount + flightAmount,
    } );

    console.log( `[orchestrator] Booking #${bookingId} fully confirmed` );

    const { data: finalBooking } = await supabase
        .from( 'bookings' )
        .select( '*' )
        .eq( 'id', bookingId )
        .single();

    return { success: true, booking: finalBooking };
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Attempt to cancel the hotel after a flight failure.
 * Errors here are swallowed and logged — the hotel cancellation failure
 * is flagged in the DB status so ops can handle it manually.
 *
 * @param {number} bookingId        - Our DB booking ID (for logging/DB update)
 * @param {string} tjHotelBookingId - TripJack hotel booking ID to cancel
 */
async function _cancelHotelSafely( bookingId, tjHotelBookingId ) {
    try {
        await hotelClient.cancelHotel( tjHotelBookingId );
        await updateBooking( bookingId, {
            status: 'cancelled',
            tj_hotel_booking_status: 'CANCELLED',
            hotel_status: 'CANCELLED',
            flight_status: 'FAILED',
        } );
        console.log( `[orchestrator] Hotel ${tjHotelBookingId} cancelled after flight failure` );
    } catch ( cancelErr ) {
        // Hotel cancel failed — mark with a distinct status so ops can intervene
        await updateBooking( bookingId, {
            status: 'flight_failed',
            tj_hotel_booking_status: 'CANCEL_FAILED',
            flight_status: 'FAILED',
        } );
        console.error(
            `[orchestrator] Hotel cancel FAILED for TJ ID ${tjHotelBookingId} (booking #${bookingId}):`,
            cancelErr.message,
        );
    }
}
