import supabase from '../config/supabaseClient.js';
import * as flightClient from '../clients/tripjack/flightClient.js';
import * as hotelClient from '../clients/tripjack/hotelClient.js';
import { generateCorrelationId } from '../utils/priceCalculator.js';
import { wait } from '../utils/helpers.js';
import logger from '../logger.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maps our stored title values to TripJack-supported passenger titles. */
const TITLE_TO_TJ_TITLE = {
    Mr: 'Mr', Mrs: 'Mrs', Ms: 'Ms', Miss: 'Miss', Master: 'Master', Dr: 'Mr',
};

/** Maximum poll attempts when waiting for a hotel booking to leave a transient state. */
const HOTEL_DETAILS_POLL_ATTEMPTS = 36;

/** Milliseconds between hotel-details polling attempts. */
const HOTEL_DETAILS_POLL_DELAY_MS = 5000;

/**
 * TripJack hotel statuses that are transient (still in-progress).
 * We poll until the status leaves this set or we exhaust all attempts.
 */
const TRANSIENT_HOTEL_STATUSES = new Set( [ 'BOOK_REQUESTED', 'PAYMENT_SUCCESS' ] );

// ─── Passenger Transformers ───────────────────────────────────────────────────

/**
 * Transforms a `booking_passengers` DB row into a TripJack flight `travellerInfo` object.
 *
 * **Important:** Do NOT include the `pid` field — TripJack rejects it at book time.
 *
 * @param {object} p - A row from the `booking_passengers` table.
 * @returns {object} TripJack travellerInfo-shaped object.
 */
function toFlightTraveller( p ) {
    const traveller = {
        ti:  TITLE_TO_TJ_TITLE[ p.title ] ?? p.title,
        fN:  p.first_name,
        lN:  p.last_name,
        pt:  p.pax_type.toUpperCase(),
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

/**
 * Constructs the `deliveryInfo` object required by TripJack booking APIs.
 * Contact details are taken from the lead passenger.
 *
 * @param {object[]} passengers - Array of `booking_passengers` rows.
 * @returns {{ hotel: object, flight: object } | null}
 *   Delivery info object, or `null` if lead passenger is missing email/phone.
 */
function buildDeliveryInfo( passengers ) {
    const leadPassenger = passengers.find( p => p.is_lead ) ?? passengers[ 0 ];
    const email         = leadPassenger?.email;
    const phone         = leadPassenger?.phone;
    const rawCode       = leadPassenger?.phone_country_code || '+91';
    const phoneCode     = rawCode.startsWith( '+' ) ? rawCode : `+${rawCode}`;

    if ( !email || !phone ) return null;

    return {
        hotel: {
            emails:   [ email ],
            contacts: [ phone ],
            code:     [ phoneCode ],
        },
        flight: {
            emails:   [ email ],
            contacts: [ `${phoneCode}${phone}` ],
        },
    };
}

/**
 * Builds the TripJack `roomTravellerInfo` array for hotel booking.
 * Lead passenger is always placed first in their room.
 *
 * @param {object[]} passengers  - Rows from `booking_passengers`.
 * @param {object[]} roomConfig  - Persisted `room_config[]` from `bookings` table.
 * @returns {object[]} TripJack `roomTravellerInfo` array.
 */
function toHotelRoomTravellers( passengers, roomConfig ) {
    const byLeadFirst = ( a, b ) => ( b.is_lead ? 1 : 0 ) - ( a.is_lead ? 1 : 0 );

    const adults   = passengers.filter( p => p.pax_type === 'adult' ).sort( byLeadFirst );
    const children = passengers.filter( p => p.pax_type === 'child' );

    let adultIdx = 0;
    let childIdx = 0;

    return roomConfig.map( room => {
        const roomPassengers = [
            ...adults.slice( adultIdx, adultIdx + room.adults ),
            ...children.slice( childIdx, childIdx + ( room.children ?? 0 ) ),
        ];

        adultIdx += room.adults;
        childIdx += room.children ?? 0;

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

// ─── Provider Response Helpers ────────────────────────────────────────────────

/**
 * Extracts a human-readable error message from a TripJack API response.
 *
 * @param {object} data     - Error response data from TripJack.
 * @param {string} fallback - Fallback message if no specific error is found.
 * @returns {string}
 */
function getProviderError( data, fallback ) {
    return data?.errors?.[ 0 ]?.message ?? data?.status?.message ?? fallback;
}

/**
 * Checks whether a TripJack response indicates a provider-level failure.
 * TripJack returns `{ status: { success: false } }` for soft failures (HTTP 200 but failed).
 *
 * @param {object} data - Response data from TripJack.
 * @returns {boolean}
 */
function isProviderFailure( data ) {
    return data?.status && data.status.success === false;
}

/**
 * Extracts the flight PNR from TripJack's booking-details response.
 * The PNR is nested inside the `travellerInfos` map, keyed by route.
 *
 * @param {object} bookingDetails - Flight booking details response from TripJack.
 * @returns {string | null} The extracted PNR, or `null` if not found.
 */
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

// ─── Flight Selection ─────────────────────────────────────────────────────────

/**
 * Extracts the outbound departure time (HH:MM) from a TripJack segment's `dt` field.
 * TripJack returns `dt` as "YYYY-MM-DDTHH:MM" for international and "YYYY-MM-DDTHH:mm" for domestic.
 *
 * @param {string | undefined} dt - Full departure datetime string from TripJack.
 * @returns {string | null} "HH:MM" string, or `null` if not parseable.
 */
function extractDepartureTime( dt ) {
    if ( !dt ) return null;
    
    const timePart = dt.split( 'T' )[ 1 ];

    return timePart ? timePart.slice( 0, 5 ) : null;
}

/**
 * Calculates the total flight fare for the booking from a single TripJack price entry.
 *
 * @param {object} priceEntry - A single price object from TripJack's search response.
 * @param {object} booking    - The `bookings` DB row (for `adults` and `children` counts).
 * @returns {number} Total flight fare in INR.
 */
function getFlightFareTotal( priceEntry, booking ) {
    const adultFare = Number( priceEntry?.fd?.ADULT?.fC?.TF ?? 0 );
    const childFare = Number( priceEntry?.fd?.CHILD?.fC?.TF ?? 0 );

    return ( adultFare * booking.adults ) + ( childFare * booking.children );
}

/**
 * Extracts all bookable flight options from a TripJack search response, enriched with
 * airline code, flight number, and departure time for matching purposes.
 *
 * @param {object} searchData - Raw TripJack search response.
 * @param {object} booking    - The `bookings` DB row.
 * @returns {Array<{ priceId, airlineCode, airlineName, flightNumber, departureTime, total }>}
 */
function extractAllFlightOptions( searchData, booking ) {
    const tripInfos = Object.values( searchData?.searchResult?.tripInfos ?? {} )
        .flatMap( value => Array.isArray( value ) ? value : [] );

    const options = [];

    for ( const tripInfo of tripInfos ) {
        // For international round trips, TripJack returns COMBO tripInfos
        // where sI[0] is the first (outbound) leg.
        const firstSegment = tripInfo.sI?.[ 0 ];
        const airlineCode  = firstSegment?.fD?.aI?.code;
        const airlineName  = firstSegment?.fD?.aI?.name;
        const flightNumber = firstSegment?.fD?.fN;
        const departureTime = extractDepartureTime( firstSegment?.dt );

        for ( const priceEntry of tripInfo.totalPriceList ?? [] ) {
            if ( !priceEntry?.id ) continue;

            options.push( {
                priceId: priceEntry.id,
                airlineCode,
                airlineName,
                flightNumber,
                departureTime,
                total: getFlightFareTotal( priceEntry, booking ),
            } );
        }
    }

    return options;
}

/**
 * Selects the best flight option from a TripJack search response using 3-level matching.
 *
 * **Matching levels (when `selectedFlight` is provided):**
 * 1. **exact_match** — same airline + same departure time (HH:MM). This guarantees
 *    the user gets the exact flight they selected, just re-validated live.
 * 2. **flight_changed** — same airline, but different departure time. The user's
 *    specific flight is sold out; this is the next best option on the same carrier.
 * 3. **sold_out** — the preferred airline has no options at all. Returns the cheapest
 *    flight from any available carrier.
 *
 * **When `selectedFlight` is absent:** filters by `fallbackAirlineCode` (preferred
 * airline from booking) if provided, then falls back to the cheapest option.
 *
 * @param {object[]} allOptions - Extracted flight options (from `extractAllFlightOptions`).
 * @param {{ airline_code: string, departure_time: string } | null} selectedFlight
 *   The user's original flight selection snapshot.
 * @param {string | null} fallbackAirlineCode
 *   Preferred airline code used when `selectedFlight` is absent.
 * @returns {{ option: object, availability: string, reason?: string } | { option: null }}
 */
function selectFlightOption( allOptions, selectedFlight, fallbackAirlineCode ) {
    if ( !allOptions.length ) return { option: null };

    if ( selectedFlight ) {
        const { airline_code, departure_time } = selectedFlight;
        const airlineUpper = airline_code.toUpperCase();

        // Level 1: exact match — same airline + same departure time
        const exactMatch = allOptions.find( o =>
            o.airlineCode === airlineUpper &&
            o.departureTime === departure_time,
        );
        if ( exactMatch ) {
            return { option: exactMatch, availability: 'exact_match' };
        }

        // Level 2: same airline, different time — cheapest of that airline
        const sameAirlineOptions = allOptions
            .filter( o => o.airlineCode === airlineUpper )
            .sort( ( a, b ) => a.total - b.total );

        if ( sameAirlineOptions.length ) {
            const best = sameAirlineOptions[ 0 ];
            
            return {
                option: best,
                availability: 'flight_changed',
                reason: `Your selected ${airline_code} flight at ${departure_time} is no longer available. ` +
                    `Showing the next available ${airline_code} option` +
                    ( best.flightNumber ? ` (flight ${best.flightNumber}` : '' ) +
                    ( best.departureTime ? ` departing at ${best.departureTime})` : ')' ) +
                    '.',
            };
        }

        // Level 3: airline not available at all — cheapest of any airline
        const cheapest = [ ...allOptions ].sort( ( a, b ) => a.total - b.total )[ 0 ];
        
        return {
            option: cheapest,
            availability: 'sold_out',
            reason: `No ${airline_code} flights are available for this route. ` +
                `Showing the next best available option` +
                ( cheapest.airlineName ? ` (${cheapest.airlineName}` : '' ) +
                ( cheapest.flightNumber ? `, flight ${cheapest.flightNumber}` : '' ) +
                ( cheapest.departureTime ? `, departing at ${cheapest.departureTime})` : ')' ) +
                '.',
        };
    }

    // No snapshot — use preferred airline filter or cheapest
    const preferred = fallbackAirlineCode
        ? allOptions.filter( o => o.airlineCode === fallbackAirlineCode.toUpperCase() )
        : [];

    const option = ( preferred.length ? preferred : allOptions )
        .sort( ( a, b ) => a.total - b.total )[ 0 ];

    return { option, availability: 'not_specified' };
}

// ─── Hotel Option Selector ────────────────────────────────────────────────────

/**
 * Selects a hotel room option from TripJack's pricing response.
 * Returns the requested `optionId` if present; otherwise falls back to cheapest.
 *
 * @param {object[]} options          - Available room options from TripJack.
 * @param {string}   [hotelOptionId]  - Optional preferred option ID.
 * @returns {object | null}
 */
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

// ─── DB State Machine ─────────────────────────────────────────────────────────

/**
 * Persists a partial update to the `bookings` row.
 * Best-effort — failures are logged but do NOT throw.
 *
 * @param {number} bookingId
 * @param {object} fields
 * @returns {Promise<void>}
 */
async function updateBooking( bookingId, fields ) {
    const { error } = await supabase
        .from( 'bookings' )
        .update( { ...fields, updated_at: new Date().toISOString() } )
        .eq( 'id', bookingId );

    if ( error ) {
        logger.error( { err: error, bookingId }, '[orchestrator] DB update failed for booking' );
    }
}

/**
 * Polls TripJack for the latest hotel booking details until the status is non-transient.
 *
 * @param {number} bookingId        - Our DB booking ID (for logging).
 * @param {string} tjHotelBookingId - TripJack hotel booking ID.
 * @returns {Promise<object | null>}
 */
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
            logger.error(
                { err, bookingId, tjHotelBookingId },
                '[orchestrator] Hotel booking-details failed'
            );
        }

        if ( attempt < HOTEL_DETAILS_POLL_ATTEMPTS ) {
            await wait( HOTEL_DETAILS_POLL_DELAY_MS );
        }
    }

    return latestDetails;
}

/**
 * Fetches the latest flight booking details from TripJack, swallowing any errors.
 *
 * @param {number} bookingId       - Our DB booking ID (for logging).
 * @param {string} flightBookingId - TripJack flight booking ID.
 * @returns {Promise<object | null>}
 */
async function getFlightBookingDetailsSafely( bookingId, flightBookingId ) {
    try {
        return await flightClient.getFlightBookingDetails( flightBookingId );
    } catch ( err ) {
        logger.error(
            { err, bookingId, flightBookingId },
            '[orchestrator] Flight booking-details failed'
        );

        return null;
    }
}

// ─── Live Review / Price Lock ─────────────────────────────────────────────────

/**
 * **Step 2 of 3** — Lock live prices and generate short-lived TripJack session tokens.
 *
 * **Flight selection strategy:**
 * Uses `booking.selected_flight` (the user's original selection snapshot) with
 * 3-level matching against a fresh TripJack search:
 *   1. `exact_match`    — same airline + same departure time (ideal)
 *   2. `flight_changed` — same airline, different time (user's flight is sold out)
 *   3. `sold_out`       — airline unavailable, shows next cheapest alternative
 *
 * The review response always includes `availability` so the frontend can
 * surface a clear notification if the user's original selection changed.
 *
 * State transitions:
 *   `initiated` / `reviewed` / `review_failed` → `reviewed`
 *   Any failure → `review_failed`
 *
 * @param {object}  params
 * @param {object}  params.booking             - Full `bookings` DB row.
 * @param {string}  [params.hotelOptionId]     - Specific hotel option to prefer.
 * @param {string}  [params.flightAirlineCode] - Airline override (fallback path only).
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

    // ── H2: Price hotel ───────────────────────────────────────────────────────
    let hotelPricing;
    try {
        hotelPricing = await hotelClient.priceHotel(
            hotel.tj_hotel_id,
            booking.departure_date,
            booking.return_date,
            roomConfig,
            correlationId,
        );
    } catch ( err ) {
        await updateBooking( booking.id, { status: 'review_failed' } );
        
        return { success: false, error: getProviderError( err.response?.data ?? err, 'Hotel pricing failed at provider' ) };
    }

    if ( isProviderFailure( hotelPricing ) ) {
        await updateBooking( booking.id, { status: 'review_failed' } );

        return { success: false, error: getProviderError( hotelPricing, 'Hotel pricing failed at provider' ) };
    }

    // ── H3: Review hotel ──────────────────────────────────────────────────────
    const hotelOption = selectHotelOption( hotelPricing.options, hotelOptionId );
    if ( !hotelOption ) {
        await updateBooking( booking.id, { status: 'review_failed' } );

        return { success: false, error: 'No hotel option is available for the selected room configuration' };
    }

    let hotelReview;
    try {
        hotelReview = await hotelClient.reviewHotel(
            hotelOption.optionId,
            hotelPricing.reviewHash,
            hotel.tj_hotel_id,
            correlationId,
        );
    } catch ( err ) {
        await updateBooking( booking.id, { status: 'review_failed' } );
        
        return { success: false, error: getProviderError( err.response?.data ?? err, 'Hotel review failed at provider' ) };
    }

    if ( isProviderFailure( hotelReview ) ) {
        await updateBooking( booking.id, { status: 'review_failed' } );

        return { success: false, error: getProviderError( hotelReview, 'Hotel review failed at provider' ) };
    }

    const hotelAmount = Number( hotelReview.option?.pricing?.totalPrice ?? hotelOption.pricing?.totalPrice );

    // ── F1: Search flights ────────────────────────────────────────────────────
    let flightSearch;
    try {
        flightSearch = await flightClient.searchFlights(
            booking.origin_iata,
            booking.destination_iata,
            booking.departure_date,
            booking.return_date,
            { ADULT: booking.adults, CHILD: booking.children },
        );
    } catch ( err ) {
        await updateBooking( booking.id, { status: 'review_failed' } );
        
        return { success: false, error: getProviderError( err.response?.data ?? err, 'Flight search failed at provider' ) };
    }

    if ( isProviderFailure( flightSearch ) ) {
        await updateBooking( booking.id, { status: 'review_failed' } );

        return { success: false, error: getProviderError( flightSearch, 'Flight search failed at provider' ) };
    }

    // ── F2: Select + match flight ─────────────────────────────────────────────
    //
    // We use booking.selected_flight (what the user saw and clicked) for 3-level
    // matching. If that's absent, we fall back to preferred_airline_code.
    //
    const allFlightOptions = extractAllFlightOptions( flightSearch, booking );
    const { option: flightOption, availability, reason: flightChangedReason } = selectFlightOption(
        allFlightOptions,
        booking.selected_flight ?? null,
        flightAirlineCode,
    );

    if ( !flightOption ) {
        await updateBooking( booking.id, { status: 'review_failed' } );

        return { success: false, error: 'No flights are available for this route and date' };
    }

    logger.info(
        { bookingId: booking.id, airlineCode: flightOption.airlineCode, flightNumber: flightOption.flightNumber, departureTime: flightOption.departureTime, availability },
        '[orchestrator] Flight selected'
    );

    // ── F3: Review flight ─────────────────────────────────────────────────────
    let flightReview;
    try {
        flightReview = await flightClient.reviewFlight( flightOption.priceId );
    } catch ( err ) {
        await updateBooking( booking.id, { status: 'review_failed' } );
        
        return { success: false, error: getProviderError( err.response?.data ?? err, 'Flight review failed at provider' ) };
    }

    if ( isProviderFailure( flightReview ) ) {
        await updateBooking( booking.id, { status: 'review_failed' } );

        return { success: false, error: getProviderError( flightReview, 'Flight review failed at provider' ) };
    }

    const flightAmount = Number(
        flightReview.totalPriceInfo?.totalFareDetail?.fC?.TF ?? flightOption.total,
    );

    // ── Persist reviewed state ────────────────────────────────────────────────
    await updateBooking( booking.id, {
        status:                    'reviewed',
        tj_hotel_booking_id:       hotelReview.bookingId,
        tj_hotel_booking_status:   'REVIEWED',
        hotel_cancellation_policy: hotelReview.option?.cancellation ?? hotelOption.cancellation ?? null,
        hotel_amount:              hotelAmount,
        hotel_status:              'REVIEWED',
        flight_booking_id:         flightReview.bookingId,
        flight_status:             'REVIEWED',
        flight_amount:             flightAmount,
        total_amount:              hotelAmount + flightAmount,
    } );

    const flightTtl = flightReview.conditions?.st ? Number( flightReview.conditions.st ) : null;
    const packageTtl = flightTtl ? Math.min( flightTtl, 900 ) : 900; // Hotel valid for ~15 mins (900s)
    const hotelPricingBreakdown = hotelReview.option?.pricing ?? hotelOption.pricing ?? {};

    return {
        success: true,
        review: {
            booking_id:   booking.id,
            status:       'reviewed',
            // Availability tells the frontend whether the user's original flight was matched.
            // "exact_match" → nothing to tell the user.
            // "flight_changed" / "sold_out" → surface flightChangedReason to the user.
            availability,
            ...( flightChangedReason ? { flight_changed_reason: flightChangedReason } : {} ),
            package_ttl_seconds: packageTtl,
            hotel: {
                name:           hotel.name,
                booking_id:     hotelReview.bookingId,
                amount:         hotelAmount,
                price_changed:  hotelReview.priceChanged ?? false,
                onhold_allowed: hotelReview.onholdAllowed ?? false,
                deadline:       hotelReview.option?.deadlineDateTime ?? null,
                option_id:      hotelReview.option?.optionId ?? hotelOption.optionId,
                cancellation:   hotelReview.option?.cancellation ?? hotelOption.cancellation ?? null,
                room_info:      hotelReview.option?.roomInfo ?? hotelOption.roomInfo ?? [],
                inclusions:     hotelReview.option?.inclusions ?? hotelOption.inclusions ?? [],
                meal_basis:     hotelReview.option?.mealBasis ?? hotelOption.mealBasis ?? null,
                booking_notes:  hotelReview.option?.bookingNotes ?? hotelOption.bookingNotes ?? null,
                compliance:     hotelReview.option?.compliance ?? hotelOption.compliance ?? null,
                pricing_breakdown: {
                    base_price: hotelPricingBreakdown.basePrice ?? 0,
                    taxes:      hotelPricingBreakdown.taxes ?? 0,
                    mf:         hotelPricingBreakdown.mf ?? 0,
                    mft:        hotelPricingBreakdown.mft ?? 0,
                    discount:   hotelPricingBreakdown.discount ?? 0,
                }
            },
            flight: {
                booking_id:          flightReview.bookingId,
                amount:              flightAmount,
                airline_code:        flightOption.airlineCode,
                airline_name:        flightOption.airlineName,
                flight_number:       flightOption.flightNumber  ?? null,
                departure_time:      flightOption.departureTime ?? null,
                session_ttl_seconds: flightTtl,
                alerts:              flightReview.alerts ?? [],
                fare_rules:          flightReview.fareRuleInformation ?? null,
                pricing_breakdown:   flightReview.totalPriceInfo ?? null,
                baggage:             flightReview.tripInfos?.[0]?.sI?.[0]?.ba ?? null,
            },
            total_amount: hotelAmount + flightAmount,
            currency:     'INR',
        },
    };
}

// ─── Core Orchestrator ────────────────────────────────────────────────────────

/**
 * **Step 3 of 3** — Execute hotel → flight booking using TripJack session tokens.
 *
 * **Booking order and compensation:**
 *   - Hotel is always booked first (TripJack provides a hotel cancel API).
 *   - If the flight fails, the hotel is automatically cancelled (compensation).
 *   - If hotel cancel also fails, booking is marked `flight_failed` with
 *     `tj_hotel_booking_status = CANCEL_FAILED` for manual ops intervention.
 *
 * **State transitions:**
 * ```
 *   reviewed     → hotel_booked  → confirmed
 *   reviewed     → hotel_failed
 *   hotel_booked → cancelled     (flight failed; hotel cancel succeeded)
 *   hotel_booked → flight_failed (flight failed; hotel cancel also failed)
 * ```
 *
 * @param {object}   params
 * @param {object}   params.booking    - Full `bookings` DB row (must be in `reviewed` status).
 * @param {object[]} params.passengers - `booking_passengers` rows for this booking.
 * @returns {Promise<{ success: boolean, error?: string, booking?: object }>}
 */
export async function orchestrateBooking( { booking, passengers } ) {
    const bookingId       = booking.id;
    const roomConfig      = booking.room_config;
    const hotelBookingId  = booking.tj_hotel_booking_id;
    const hotelAmount     = Number( booking.hotel_amount );
    const flightBookingId = booking.flight_booking_id;
    const flightAmount    = Number( booking.flight_amount );

    if ( !Array.isArray( roomConfig ) || roomConfig.length === 0 ) {
        return { success: false, error: 'Booking room_config is missing. Recreate the booking with rooms[] from the frontend.' };
    }

    // Guard: amounts must be real positive numbers.
    // Note: Number(null) === 0 (not NaN), so we also check for null explicitly.
    if (
        !hotelBookingId || !flightBookingId ||
        booking.hotel_amount === null || booking.flight_amount === null ||
        Number.isNaN( hotelAmount ) || Number.isNaN( flightAmount )
    ) {
        return { success: false, error: 'Booking must be reviewed before it can be confirmed' };
    }

    const delivery = buildDeliveryInfo( passengers );
    if ( !delivery ) {
        return { success: false, error: 'Lead passenger email and phone are required for TripJack booking delivery' };
    }

    // ── Step 1: Book Hotel ────────────────────────────────────────────────────
    const roomTravellers = toHotelRoomTravellers( passengers, roomConfig );

    let tjHotelBookingId = hotelBookingId;

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
        logger.error( { err, bookingId, msg }, '[orchestrator] Hotel booking threw' );
        await updateBooking( bookingId, { status: 'hotel_failed', hotel_status: 'FAILED' } );
        
        return { 
            success: false, 
            status: 'HOTEL_FAILED + FLIGHT_SKIPPED',
            error: `Hotel booking failed: ${msg}`,
            data: { hotel_error: msg, flight_status: 'SKIPPED' }
        };
    }

    if ( hotelResult?.status && !hotelResult.status.success ) {
        const msg = hotelResult.errors?.[ 0 ]?.message ?? 'Hotel booking rejected by provider';
        await updateBooking( bookingId, { status: 'hotel_failed', hotel_status: 'FAILED' } );
        
        return { 
            success: false, 
            status: 'HOTEL_FAILED + FLIGHT_SKIPPED',
            error: `Hotel booking failed: ${msg}`,
            data: { hotel_error: msg, flight_status: 'SKIPPED' }
        };
    }

    tjHotelBookingId = hotelResult.bookingId ?? hotelResult.order?.bookingId ?? hotelBookingId;

    const hotelDetails = await getHotelBookingDetailsSafely( bookingId, tjHotelBookingId );
    const hotelStatus  = hotelDetails?.order?.status ?? hotelResult.order?.status ?? 'BOOK_REQUESTED';

    await updateBooking( bookingId, {
        status:                  'hotel_booked',
        tj_hotel_booking_id:     tjHotelBookingId,
        tj_hotel_booking_status: hotelStatus,
        hotel_status:            hotelStatus,
        hotel_amount:            hotelAmount,
        hotel_booked_at:         new Date().toISOString(),
    } );

    logger.info( { bookingId, tjHotelBookingId }, '[orchestrator] Hotel booked' );

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
        logger.error( { err, bookingId, msg }, '[orchestrator] Flight booking threw' );
        const cancelResult = await _cancelHotelSafely( bookingId, tjHotelBookingId );
        
        return { 
            success: false, 
            status: cancelResult.success ? 'HOTEL_SUCCESS + FLIGHT_FAILED + HOTEL_CANCELLED' : 'HOTEL_SUCCESS + FLIGHT_FAILED + HOTEL_CANCEL_FAILED',
            error: `Flight booking failed: ${msg}. Hotel was ${cancelResult.success ? 'cancelled successfully' : 'NOT cancelled'}`,
            data: {
                flight_error: msg,
                hotel_cancel_status: cancelResult.success ? 'SUCCESS' : 'FAILED',
                hotel_cancel_error: cancelResult.success ? null : cancelResult.error
            }
        };
    }

    if ( flightResult?.status && !flightResult.status.success ) {
        const msg = flightResult.errors?.[ 0 ]?.message ?? 'Flight booking rejected by provider';
        logger.error( { bookingId, msg }, '[orchestrator] Flight rejected' );
        const cancelResult = await _cancelHotelSafely( bookingId, tjHotelBookingId );
        
        return { 
            success: false, 
            status: cancelResult.success ? 'HOTEL_SUCCESS + FLIGHT_FAILED + HOTEL_CANCELLED' : 'HOTEL_SUCCESS + FLIGHT_FAILED + HOTEL_CANCEL_FAILED',
            error: `Flight booking failed: ${msg}. Hotel was ${cancelResult.success ? 'cancelled successfully' : 'NOT cancelled'}`,
            data: {
                flight_error: msg,
                hotel_cancel_status: cancelResult.success ? 'SUCCESS' : 'FAILED',
                hotel_cancel_error: cancelResult.success ? null : cancelResult.error
            }
        };
    }

    // ── Step 3: Mark Confirmed ────────────────────────────────────────────────
    const confirmedFlightBookingId = flightResult.bookingId ?? flightResult.order?.bookingId ?? flightBookingId;
    const flightDetails  = await getFlightBookingDetailsSafely( bookingId, confirmedFlightBookingId );
    const flightStatus   = flightDetails?.order?.status ?? flightResult.order?.status ?? 'BOOK_REQUESTED';
    const flightPnr      = extractFlightPnr( flightDetails );

    await updateBooking( bookingId, {
        status:            'confirmed',
        flight_booking_id: confirmedFlightBookingId,
        flight_pnr:        flightPnr,
        flight_status:     flightStatus,
        flight_amount:     flightAmount,
        flight_booked_at:  new Date().toISOString(),
        total_amount:      hotelAmount + flightAmount,
    } );

    logger.info( { bookingId }, '[orchestrator] Booking fully confirmed' );

    const { data: finalBooking } = await supabase
        .from( 'bookings' )
        .select( '*' )
        .eq( 'id', bookingId )
        .single();

    return { 
        success: true, 
        booking: finalBooking,
        hotel_details: hotelDetails,
        flight_details: flightDetails
    };
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Attempts to cancel the hotel after a flight booking failure (compensating transaction).
 *
 * Errors are swallowed and logged — if the cancel also fails, the booking is marked
 * `flight_failed` with `tj_hotel_booking_status = CANCEL_FAILED` for manual ops handling.
 *
 * @param {number} bookingId        - Our DB booking ID.
 * @param {string} tjHotelBookingId - TripJack hotel booking ID to cancel.
 * @returns {Promise<void>}
 */
async function _cancelHotelSafely( bookingId, tjHotelBookingId ) {
    try {
        await hotelClient.cancelHotel( tjHotelBookingId );
        await updateBooking( bookingId, {
            status:                  'cancelled',
            tj_hotel_booking_status: 'CANCELLED',
            hotel_status:            'CANCELLED',
            flight_status:           'FAILED',
        } );
        logger.info( { tjHotelBookingId }, '[orchestrator] Hotel cancelled after flight failure' );
        
        return { success: true };
    } catch ( cancelErr ) {
        await updateBooking( bookingId, {
            status:                  'flight_failed',
            tj_hotel_booking_status: 'CANCEL_FAILED',
            flight_status:           'FAILED',
        } );
        logger.error(
            { err: cancelErr, bookingId, tjHotelBookingId },
            '[orchestrator] Hotel cancel FAILED for TJ ID'
        );
        
        return { success: false, error: cancelErr.message };
    }
}
