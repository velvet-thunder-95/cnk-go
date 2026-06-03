import supabase from '../config/supabaseClient.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import response from '../utils/response.js';
import { orchestrateBooking, reviewPackageBooking } from '../services/bookingOrchestrator.js';
import { MAX_CHILD_AGE } from '../utils/constants.js';
import { parseNonNegativeInt, isValidDate, isValidPanNumber } from '../utils/helpers.js';

// ─── Validation Constants ─────────────────────────────────────────────────────

const VALID_TITLES    = [ 'Mr', 'Mrs', 'Ms', 'Miss', 'Master', 'Dr' ];
const VALID_PAX_TYPES = [ 'adult', 'child' ];

// 'O' (Other) is accepted internally; TripJack has no gender field so no mapping needed.
const VALID_GENDERS   = [ 'M', 'F', 'O' ];

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Normalizes and validates the `rooms` array from the request body.
 *
 * Each room must have at least 1 adult. If a room has children, a matching
 * `childAge` array with one age per child must also be provided, and each
 * age must be between 0 and MAX_CHILD_AGE (inclusive).
 *
 * @param {Array<{ adults: number, children?: number, childAge?: number[] }>} rooms
 *   Raw `rooms` array from the request body.
 * @returns {{ rooms: object[], adultCount: number, childCount: number } | { error: string }}
 */
function normalizeRoomConfig( rooms ) {
    if ( !Array.isArray( rooms ) || rooms.length === 0 ) {
        return { error: 'rooms array is required and must not be empty' };
    }

    let adultCount = 0;
    let childCount = 0;
    const normalizedRooms = [];

    for ( let i = 0; i < rooms.length; i++ ) {
        const room  = rooms[ i ];
        const label = `rooms[${i}]`;

        const roomAdults   = parseNonNegativeInt( room.adults );
        const roomChildren = parseNonNegativeInt( room.children ?? 0 );

        if ( Number.isNaN( roomAdults ) || roomAdults < 1 ) {
            return { error: `${label}: adults must be at least 1` };
        }
        if ( Number.isNaN( roomChildren ) ) {
            return { error: `${label}: children must be 0 or more` };
        }

        const rawChildAges = room.childAge ?? room.child_ages ?? [];
        if ( roomChildren > 0 ) {
            if ( !Array.isArray( rawChildAges ) || rawChildAges.length !== roomChildren ) {
                return { error: `${label}: childAge must contain one age per child` };
            }
            const invalidAge = rawChildAges.some( age => {
                const parsedAge = parseNonNegativeInt( age );
                
                return Number.isNaN( parsedAge ) || parsedAge > MAX_CHILD_AGE;
            } );
            if ( invalidAge ) {
                return { error: `${label}: childAge values must be between 0 and ${MAX_CHILD_AGE}` };
            }
        }

        const childAge = roomChildren > 0
            ? rawChildAges.map( age => parseInt( age, 10 ) )
            : [];

        adultCount += roomAdults;
        childCount += roomChildren;

        normalizedRooms.push( {
            adults: roomAdults,
            children: roomChildren,
            ...( childAge.length ? { childAge } : {} ),
        } );
    }

    return { rooms: normalizedRooms, adultCount, childCount };
}

/**
 * Validates a single passenger object from the request body.
 *
 * @param {object} p   - Raw passenger object.
 * @param {number} idx - Array index (for error messages).
 * @returns {string | null} Error message, or `null` if valid.
 */
function validatePassenger( p, idx ) {
    const label = `passengers[${idx}]`;

    if ( !p.title || !VALID_TITLES.includes( p.title ) ) {
        return `${label}: title must be one of ${VALID_TITLES.join( ', ' )}`;
    }
    if ( !p.first_name?.trim() ) return `${label}: first_name is required`;
    if ( !p.last_name?.trim()  ) return `${label}: last_name is required`;

    if ( !p.pax_type || !VALID_PAX_TYPES.includes( p.pax_type ) ) {
        return `${label}: pax_type must be one of ${VALID_PAX_TYPES.join( ', ' )}`;
    }
    if ( !p.gender || !VALID_GENDERS.includes( p.gender ) ) {
        return `${label}: gender must be one of ${VALID_GENDERS.join( ', ' )}`;
    }

    if ( !p.date_of_birth ) return `${label}: date_of_birth is required (YYYY-MM-DD)`;
    if ( !isValidDate( p.date_of_birth ) ) {
        return `${label}: date_of_birth must be a valid calendar date in YYYY-MM-DD format`;
    }

    if ( !p.nationality ) return `${label}: nationality is required (ISO 3166-1 alpha-2, e.g. IN)`;

    // Validate passport_expiry format when provided (international bookings send this to TripJack)
    if ( p.passport_expiry && !isValidDate( p.passport_expiry ) ) {
        return `${label}: passport_expiry must be a valid calendar date in YYYY-MM-DD format`;
    }

    // Validate PAN format when provided (TripJack rejects malformed PANs at booking time)
    if ( p.pan_number && !isValidPanNumber( p.pan_number.toUpperCase() ) ) {
        return `${label}: pan_number must be a valid Indian PAN (e.g. BPHPY1955F)`;
    }

    return null;
}

/**
 * Validates and normalizes the optional `selected_flight` snapshot object.
 *
 * `selected_flight` captures the exact flight the user clicked on the package
 * listing page. It is used at Review time to try to re-validate the same flight
 * (matching on airline + departure time) before falling back to alternatives.
 *
 * @param {unknown} sf - Raw `selected_flight` value from the request body.
 * @returns {{ value: object } | { error: string }}
 */
function normalizeSelectedFlight( sf ) {
    if ( typeof sf !== 'object' || sf === null || Array.isArray( sf ) ) {
        return { error: 'selected_flight must be an object' };
    }
    if ( !sf.airline_code || typeof sf.airline_code !== 'string' ) {
        return { error: 'selected_flight.airline_code is required (IATA carrier code, e.g. "SG")' };
    }
    if ( !sf.departure_time || typeof sf.departure_time !== 'string' ) {
        return { error: 'selected_flight.departure_time is required (HH:MM format, e.g. "14:00")' };
    }
    // Loose HH:MM format check
    if ( !/^\d{1,2}:\d{2}$/.test( sf.departure_time ) ) {
        return { error: 'selected_flight.departure_time must be in HH:MM format' };
    }

    return {
        value: {
            airline_code:   sf.airline_code.toUpperCase(),
            departure_time: sf.departure_time,
            price:          sf.price !== null ? Number( sf.price ) : null,
        },
    };
}

// ─── POST /api/bookings ───────────────────────────────────────────────────────
//
// Step 1 of 3: Create a booking record and save all passengers.
// Returns booking_id for use in the /review step.
//
// Body:
// {
//   origin_iata, destination_iata, departure_date, return_date, nights,
//   adults, children,
//   rooms: [{ adults, children, childAge? }],
//   hotel_id,
//   preferred_airline_code?,          IATA code (e.g. "SG") — fallback at review
//   selected_flight?: {               Snapshot of what the user clicked
//     airline_code,                   IATA carrier code
//     departure_time,                 "HH:MM" outbound departure
//     price?                          Display price (for audit)
//   },
//   estimated_flight_cost?,           Display price from cache (for audit)
//   estimated_hotel_cost?,
//   passengers: [ { ...passengerFields } ]
// }

/**
 * **Step 1 of 3** — Create a booking record with passengers.
 *
 * No TripJack API calls. Validates all inputs, creates a `bookings` row
 * (status = 'initiated'), and bulk-inserts `booking_passengers` rows.
 *
 * Key field — `selected_flight`:
 *   A small snapshot `{ airline_code, departure_time, price? }` of the
 *   exact flight the user selected on the package listing page. At Review
 *   time, the orchestrator matches against this snapshot to guarantee the
 *   user gets the same flight (or is transparently shown the best alternative).
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
export const initiateBooking = asyncHandler( async ( req, res ) => {
    const {
        origin_iata,
        destination_iata,
        departure_date,
        return_date,
        nights,
        adults,
        children,
        child_ages,
        rooms,
        hotel_id,
        preferred_airline_code,
        selected_flight,
        estimated_flight_cost,
        estimated_hotel_cost,
        passengers,
    } = req.body;

    // ── Required field checks ─────────────────────────────────────────────────
    if ( !origin_iata      ) return response( res, false, 400, 'origin_iata is required' );
    if ( !destination_iata ) return response( res, false, 400, 'destination_iata is required' );
    if ( !departure_date   ) return response( res, false, 400, 'departure_date is required (YYYY-MM-DD)' );
    if ( !return_date      ) return response( res, false, 400, 'return_date is required (YYYY-MM-DD)' );

    if ( !isValidDate( departure_date ) ) return response( res, false, 400, 'departure_date must be a valid calendar date in YYYY-MM-DD format' );
    if ( !isValidDate( return_date ) )    return response( res, false, 400, 'return_date must be a valid calendar date in YYYY-MM-DD format' );
    if ( return_date <= departure_date )  return response( res, false, 400, 'return_date must be after departure_date' );

    if ( !hotel_id         ) return response( res, false, 400, 'hotel_id is required' );

    // ── Room config ───────────────────────────────────────────────────────────
    const roomConfig = normalizeRoomConfig( rooms );
    if ( roomConfig.error ) return response( res, false, 400, roomConfig.error );

    // Derive pax counts — if caller omits adults/children, infer from rooms
    const parsedNights   = parseInt( nights, 10 );
    const parsedAdults   = adults === undefined || adults === null
        ? roomConfig.adultCount
        : parseInt( adults, 10 );
    const parsedChildren = children === undefined || children === null
        ? roomConfig.childCount
        : parseInt( children, 10 );

    if ( isNaN( parsedNights )   || parsedNights < 1  ) return response( res, false, 400, 'nights must be at least 1' );
    if ( isNaN( parsedAdults )   || parsedAdults < 1  ) return response( res, false, 400, 'adults must be at least 1' );
    if ( isNaN( parsedChildren ) || parsedChildren < 0 ) return response( res, false, 400, 'children must be 0 or more' );

    if ( parsedAdults !== roomConfig.adultCount ) {
        return response( res, false, 400,
            `Total adults from rooms (${roomConfig.adultCount}) does not match top-level adults (${parsedAdults})` );
    }
    if ( parsedChildren !== roomConfig.childCount ) {
        return response( res, false, 400,
            `Total children from rooms (${roomConfig.childCount}) does not match top-level children (${parsedChildren})` );
    }

    // ── selected_flight (optional) ────────────────────────────────────────────
    let normalizedSelectedFlight = null;
    if ( selected_flight !== undefined && selected_flight !== null ) {
        const sfResult = normalizeSelectedFlight( selected_flight );
        if ( sfResult.error ) return response( res, false, 400, sfResult.error );
        normalizedSelectedFlight = sfResult.value;
    }

    // ── Passenger validation ──────────────────────────────────────────────────
    if ( !Array.isArray( passengers ) || passengers.length === 0 ) {
        return response( res, false, 400, 'passengers array is required and must not be empty' );
    }

    for ( let i = 0; i < passengers.length; i++ ) {
        const err = validatePassenger( passengers[ i ], i );
        if ( err ) return response( res, false, 400, err );
    }

    const totalPax = parsedAdults + parsedChildren;
    if ( passengers.length !== totalPax ) {
        return response( res, false, 400,
            `passengers length (${passengers.length}) must equal adults + children (${totalPax})` );
    }

    const passengerAdultCount = passengers.filter( p => p.pax_type === 'adult' ).length;
    const passengerChildCount = passengers.filter( p => p.pax_type === 'child' ).length;

    if ( passengerAdultCount !== parsedAdults ) {
        return response( res, false, 400,
            `adult passengers (${passengerAdultCount}) must match adults (${parsedAdults})` );
    }
    if ( passengerChildCount !== parsedChildren ) {
        return response( res, false, 400,
            `child passengers (${passengerChildCount}) must match children (${parsedChildren})` );
    }

    const leadCount = passengers.filter( p => p.is_lead === true ).length;
    if ( leadCount !== 1 ) {
        return response( res, false, 400, 'Exactly one passenger must have is_lead: true' );
    }

    const leadPassenger = passengers.find( p => p.is_lead === true );
    if ( !leadPassenger.email ) {
        return response( res, false, 400, 'Lead passenger must have an email' );
    }
    if ( !leadPassenger.phone ) {
        return response( res, false, 400, 'Lead passenger must have a phone number' );
    }

    // ── Create booking record ─────────────────────────────────────────────────
    const hasFlightEstimate = estimated_flight_cost !== undefined && estimated_flight_cost !== null;
    const hasHotelEstimate  = estimated_hotel_cost  !== undefined && estimated_hotel_cost  !== null;
    const estimated_total   = hasFlightEstimate && hasHotelEstimate
        ? Number( estimated_flight_cost ) + Number( estimated_hotel_cost )
        : null;

    const computedChildAges = roomConfig.rooms.flatMap( room => room.childAge ?? [] );

    const { data: booking, error: bookingErr } = await supabase
        .from( 'bookings' )
        .insert( {
            user_id:               req.user?.id ?? null,
            origin_iata:           origin_iata.toUpperCase(),
            destination_iata:      destination_iata.toUpperCase(),
            departure_date,
            return_date,
            nights:                parsedNights,
            adults:                parsedAdults,
            children:              parsedChildren,
            child_ages:            child_ages ?? ( computedChildAges.length ? computedChildAges : null ),
            rooms:                 roomConfig.rooms.length,
            room_config:           roomConfig.rooms,
            hotel_id:              hotel_id              ?? null,
            preferred_airline_code: preferred_airline_code
                ? preferred_airline_code.toUpperCase()
                : null,
            selected_flight:       normalizedSelectedFlight,
            estimated_flight_cost: estimated_flight_cost ?? null,
            estimated_hotel_cost:  estimated_hotel_cost  ?? null,
            estimated_total,
            status: 'initiated',
        } )
        .select( 'id' )
        .single();

    if ( bookingErr ) throw bookingErr;

    // ── Insert passengers ─────────────────────────────────────────────────────
    const passengerRows = passengers.map( p => ( {
        booking_id:         booking.id,
        title:              p.title,
        first_name:         p.first_name.trim(),
        last_name:          p.last_name.trim(),
        pax_type:           p.pax_type,
        gender:             p.gender,
        date_of_birth:      p.date_of_birth,
        is_lead:            p.is_lead ?? false,
        email:              p.email              ?? null,
        phone:              p.phone              ?? null,
        phone_country_code: p.phone_country_code ?? null,
        passport_number:    p.passport_number    ?? null,
        passport_expiry:    p.passport_expiry    ?? null,
        nationality:        p.nationality        ?? 'IN',
        pan_number:         p.pan_number         ?? null,
        address_line_1:     p.address_line_1     ?? null,
        city:               p.city               ?? null,
        country_code:       p.country_code       ?? null,
        country_name:       p.country_name       ?? null,
    } ) );

    const { error: passengerErr } = await supabase
        .from( 'booking_passengers' )
        .insert( passengerRows );

    if ( passengerErr ) {
        // Rollback the booking row to avoid orphaned records
        await supabase.from( 'bookings' ).delete().eq( 'id', booking.id );
        throw passengerErr;
    }

    return response( res, true, 201, 'Booking initiated successfully', { booking_id: booking.id } );
} );

// ─── POST /api/bookings/:id/review ───────────────────────────────────────────
//
// Step 2 of 3: Lock live prices and obtain short-lived TripJack session tokens.
//
// Flight selection uses 3-level matching against booking.selected_flight:
//   1. Same airline + same departure_time → "exact_match"
//   2. Same airline, different time       → "flight_changed"
//   3. Airline unavailable               → "sold_out"
// The response always includes `availability` so the frontend can inform the user.
//
// Body (all optional):
// {
//   hotelOptionId?: string,       cheapest hotel option is used if absent
//   flightAirlineCode?: string    one-time override for preferred airline
// }

/**
 * **Step 2 of 3** — Lock live prices and generate short-lived TripJack tokens.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
export const reviewBooking = asyncHandler( async ( req, res ) => {
    const bookingId = parseInt( req.params.id, 10 );
    if ( isNaN( bookingId ) ) return response( res, false, 400, 'Invalid booking id' );

    const { hotelOptionId, flightAirlineCode } = req.body;

    const { data: booking, error: bookingErr } = await supabase
        .from( 'bookings' )
        .select( '*' )
        .eq( 'id', bookingId )
        .single();

    if ( bookingErr || !booking ) return response( res, false, 404, 'Booking not found' );

    if ( ![ 'initiated', 'reviewed', 'review_failed' ].includes( booking.status ) ) {
        return response( res, false, 409, `Cannot review: booking is already '${booking.status}'` );
    }

    const result = await reviewPackageBooking( {
        booking,
        hotelOptionId,
        // Body override takes priority; then fall back to persisted preferred_airline_code
        flightAirlineCode: flightAirlineCode ?? booking.preferred_airline_code ?? null,
    } );

    if ( !result.success ) {
        return response( res, false, 502, result.error );
    }

    return response( res, true, 200, 'Booking reviewed successfully', result.review );
} );

// ─── POST /api/bookings/:id/confirm ──────────────────────────────────────────
//
// Step 3 of 3: Execute hotel → flight booking using the tokens from /review.
// Booking must be in 'reviewed' status. Calling this more than once returns 409.

/**
 * **Step 3 of 3** — Execute hotel → flight booking.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
export const confirmBooking = asyncHandler( async ( req, res ) => {
    const bookingId = parseInt( req.params.id, 10 );
    if ( isNaN( bookingId ) ) return response( res, false, 400, 'Invalid booking id' );

    const { data: booking, error: bookingErr } = await supabase
        .from( 'bookings' )
        .select( '*' )
        .eq( 'id', bookingId )
        .single();

    if ( bookingErr || !booking ) return response( res, false, 404, 'Booking not found' );

    if ( booking.status !== 'reviewed' ) {
        return response( res, false, 409,
            `Booking not in REVIEWED state (current: '${booking.status}'). Run /review first.` );
    }

    const { data: passengers, error: passengerErr } = await supabase
        .from( 'booking_passengers' )
        .select( '*' )
        .eq( 'booking_id', bookingId )
        .order( 'is_lead', { ascending: false } );   // lead passenger first

    if ( passengerErr ) throw passengerErr;
    if ( !passengers?.length ) {
        return response( res, false, 400, 'No passengers found for this booking' );
    }

    const result = await orchestrateBooking( { booking, passengers } );

    if ( !result.success ) {
        return response( res, false, 502, result.error );
    }

    return response( res, true, 200, 'Booking confirmed successfully', {
        booking_id:          booking.id,
        status:              result.booking?.status,
        tj_hotel_booking_id: result.booking?.tj_hotel_booking_id,
        flight_booking_id:   result.booking?.flight_booking_id,
        total_amount:        result.booking?.total_amount,
    } );
} );

// ─── GET /api/bookings/:id ────────────────────────────────────────────────────

/**
 * Fetch a single booking by ID, including all nested passengers.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
export const getBooking = asyncHandler( async ( req, res ) => {
    const bookingId = parseInt( req.params.id, 10 );
    if ( isNaN( bookingId ) ) return response( res, false, 400, 'Invalid booking id' );

    const { data: booking, error } = await supabase
        .from( 'bookings' )
        .select( '*, booking_passengers(*)' )
        .eq( 'id', bookingId )
        .single();

    if ( error || !booking ) return response( res, false, 404, 'Booking not found' );

    return response( res, true, 200, null, booking );
} );

// ─── GET /api/bookings ────────────────────────────────────────────────────────

/**
 * List bookings summary — newest first, max 50 rows.
 * Passenger details omitted intentionally (use GET /api/bookings/:id for those).
 *
 * TODO: filter by req.user.id once auth is enabled.
 *
 * @param {import('express').Request}  _req
 * @param {import('express').Response} res
 */
export const listBookings = asyncHandler( async ( _req, res ) => {
    const { data: bookings, error } = await supabase
        .from( 'bookings' )
        .select(
            'id, origin_iata, destination_iata, departure_date, return_date, ' +
            'nights, adults, children, status, total_amount, currency, created_at',
        )
        .order( 'created_at', { ascending: false } )
        .limit( 50 );

    if ( error ) throw error;

    return response( res, true, 200, null, bookings );
} );
