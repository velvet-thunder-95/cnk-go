import supabase from '../config/supabaseClient.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import response from '../utils/response.js';
import { orchestrateBooking, reviewPackageBooking } from '../services/bookingOrchestrator.js';
import { MAX_CHILD_AGE } from '../utils/constants.js';

// ─── Passenger Validation ─────────────────────────────────────────────────────

const VALID_TITLES    = [ 'Mr', 'Mrs', 'Ms', 'Miss', 'Master', 'Dr' ]

const VALID_PAX_TYPES = [ 'adult', 'child' ];

// 'O' (Other) is accepted internally; TripJack has no gender field so no mapping needed.
const VALID_GENDERS   = [ 'M', 'F', 'O' ];

function parseNonNegativeInt( value ) {
    const parsed = parseInt( value, 10 );

    return Number.isNaN( parsed ) || parsed < 0 ? NaN : parsed;
}

function normalizeRoomConfig( rooms ) {
    if ( !Array.isArray( rooms ) || rooms.length === 0 ) {
        return { error: 'rooms array is required and must not be empty' };
    }

    let adultCount = 0;
    let childCount = 0;

    const normalizedRooms = [];

    for ( let i = 0; i < rooms.length; i++ ) {
        const room = rooms[ i ];
        const label = `rooms[${i}]`;
        
        const roomAdults = parseNonNegativeInt( room.adults );
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

            if ( invalidAge ) return { error: `${label}: childAge values must be between 0 and ${MAX_CHILD_AGE}` };
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
 * Validate a single passenger object from the request body.
 * @param {object} p    Passenger object
 * @param {number} idx  Array index (for error messages)
 * @returns {string|null}  Error message or null if valid
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
    
    // Validate strict YYYY-MM-DD format
    if ( !/^\d{4}-\d{2}-\d{2}$/.test( p.date_of_birth ) || Number.isNaN( Date.parse( p.date_of_birth ) ) ) {
        return `${label}: date_of_birth must be a valid date in YYYY-MM-DD format`;
    }
    
    if ( !p.nationality ) return `${label}: nationality is required (ISO 3166-1 alpha-2, e.g. IN)`;
    
    return null;
}

// ─── POST /api/bookings ───────────────────────────────────────────────────────
//
// Step 1 of 3: Create a booking record and save all passengers.
// The frontend calls this after the user fills in the passenger form.
// Returns booking_id for use in the /review step.
//
// Body:
// {
//   origin_iata, destination_iata, departure_date, return_date,
//   nights, adults, children, child_ages (int[]),
//   rooms: [{ adults, children, childAge? }],
//   hotel_id (our DB id for the selected hotel),
//   preferred_airline_code? (IATA code the user selected on detail page, e.g. 'AI'),
//   estimated_flight_cost, estimated_hotel_cost (optional — from cache display price),
//   passengers: [
//     {
//       title, first_name, last_name, pax_type, gender (M/F/O), date_of_birth,
//       nationality, is_lead (bool — exactly one must be true),
//       email?, phone?, phone_country_code?,
//       passport_number?, passport_expiry?,
//       pan_number?, address_line_1?, city?, country_code?, country_name?
//     }
//   ]
// }

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
        estimated_flight_cost,
        estimated_hotel_cost,
        passengers,
    } = req.body;

    // ── Required field checks ─────────────────────────────────────────────────
    if ( !origin_iata      ) return response( res, false, 400, 'origin_iata is required' );
    if ( !destination_iata ) return response( res, false, 400, 'destination_iata is required' );
    if ( !departure_date   ) return response( res, false, 400, 'departure_date is required (YYYY-MM-DD)' );
    if ( !return_date      ) return response( res, false, 400, 'return_date is required (YYYY-MM-DD)' );
    if ( !hotel_id         ) return response( res, false, 400, 'hotel_id is required' );

    const roomConfig = normalizeRoomConfig( rooms );
    if ( roomConfig.error ) return response( res, false, 400, roomConfig.error );

    const parsedNights = parseInt( nights, 10 );
    const parsedAdults = adults === undefined || adults === null
        ? roomConfig.adultCount
        : parseInt( adults, 10 );
    const parsedChildren = children === undefined || children === null
        ? roomConfig.childCount
        : parseInt( children, 10 );

    if ( isNaN( parsedNights )   || parsedNights < 1  ) return response( res, false, 400, 'nights must be at least 1' );
    if ( isNaN( parsedAdults )   || parsedAdults < 1  ) return response( res, false, 400, 'adults must be at least 1' );
    if ( isNaN( parsedChildren ) || parsedChildren < 0 ) return response( res, false, 400, 'children must be 0 or more' );

    if ( parsedAdults !== roomConfig.adultCount ) {
        return response( res, false, 400, `adults (${parsedAdults}) must match rooms adult total (${roomConfig.adultCount})` );
    }
    if ( parsedChildren !== roomConfig.childCount ) {
        return response( res, false, 400, `children (${parsedChildren}) must match rooms child total (${roomConfig.childCount})` );
    }

    if ( !Array.isArray( passengers ) || passengers.length === 0 ) {
        return response( res, false, 400, 'passengers array is required and must not be empty' );
    }

    // ── Validate each passenger ───────────────────────────────────────────────
    for ( let i = 0; i < passengers.length; i++ ) {
        const err = validatePassenger( passengers[ i ], i );
        if ( err ) return response( res, false, 400, err );
    }

    // Passenger count must match adults + children
    const totalPax = parsedAdults + parsedChildren;
    if ( passengers.length !== totalPax ) {
        return response(
            res, false, 400,
            `passengers length (${passengers.length}) must equal adults + children (${totalPax})`,
        );
    }

    const passengerAdultCount = passengers.filter( p => p.pax_type === 'adult' ).length;
    const passengerChildCount = passengers.filter( p => p.pax_type === 'child' ).length;

    if ( passengerAdultCount !== parsedAdults ) {
        return response( res, false, 400, `adult passengers (${passengerAdultCount}) must match adults (${parsedAdults})` );
    }
    if ( passengerChildCount !== parsedChildren ) {
        return response( res, false, 400, `child passengers (${passengerChildCount}) must match children (${parsedChildren})` );
    }

    // Exactly one lead passenger required
    const leadCount = passengers.filter( p => p.is_lead === true ).length;
    if ( leadCount !== 1 ) {
        return response( res, false, 400, 'Exactly one passenger must have is_lead: true' );
    }

    const leadPassenger = passengers.find( p => p.is_lead === true );
    if ( !leadPassenger.email || !leadPassenger.phone ) {
        return response( res, false, 400, 'Lead passenger email and phone are required' );
    }

    // ── Create booking record ─────────────────────────────────────────────────
    const hasFlightEstimate = estimated_flight_cost !== undefined && estimated_flight_cost !== null;
    const hasHotelEstimate = estimated_hotel_cost !== undefined && estimated_hotel_cost !== null;
    const estimated_total =
        hasFlightEstimate && hasHotelEstimate
            ? Number( estimated_flight_cost ) + Number( estimated_hotel_cost )
            : null;

    const computedChildAges = roomConfig.rooms.flatMap( room => room.childAge ?? [] );

    const { data: booking, error: bookingErr } = await supabase
        .from( 'bookings' )
        .insert( {
            user_id: req.user?.id ?? null,   // null until auth is wired up
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
            hotel_id:                hotel_id              ?? null,
            preferred_airline_code:  preferred_airline_code ? preferred_airline_code.toUpperCase() : null,
            estimated_flight_cost:   estimated_flight_cost  ?? null,
            estimated_hotel_cost:  estimated_hotel_cost  ?? null,
            estimated_total,
            status:                'initiated',
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
        email:              p.email             ?? null,
        phone:              p.phone             ?? null,
        phone_country_code: p.phone_country_code ?? null,
        passport_number:    p.passport_number   ?? null,
        passport_expiry:    p.passport_expiry   ?? null,
        nationality:        p.nationality       ?? 'IN',
        pan_number:         p.pan_number        ?? null,
        address_line_1:     p.address_line_1    ?? null,
        city:               p.city              ?? null,
        country_code:       p.country_code      ?? null,
        country_name:       p.country_name      ?? null,
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
// Step 2 of 3: Create short-lived TripJack review tokens and final prices.
// This should be called only after passenger details are saved and the user is
// ready to see the final confirmation screen.
//
// Body: (all fields optional)
// {
//   hotelOptionId?: string,       // if absent, cheapest hotel option from live pricing is used
//   flightAirlineCode?: string    // overrides booking.preferred_airline_code for this review only
// }

export const reviewBooking = asyncHandler( async ( req, res ) => {
    const bookingId = parseInt( req.params.id, 10 );
    if ( isNaN( bookingId ) ) return response( res, false, 400, 'Invalid booking id' );

    const { hotelOptionId, flightAirlineCode } = req.body;

    // flightAirlineCode in the request body overrides the persisted preference.
    // This lets the frontend allow the user to change airline at review time.

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
        // Body takes priority; fall back to what was saved at initiation.
        flightAirlineCode: flightAirlineCode ?? booking.preferred_airline_code ?? null,
    } );

    if ( !result.success ) {
        return response( res, false, 502, result.error );
    }

    return response( res, true, 200, 'Booking reviewed successfully', result.review );
} );

// ─── POST /api/bookings/:id/confirm ──────────────────────────────────────────
//
// Step 3 of 3: Orchestrate hotel → flight booking using short-lived TripJack
// tokens saved by POST /api/bookings/:id/review.
//
// The booking must be in 'reviewed' status. Calling this more than once on the
// same booking returns 409.

export const confirmBooking = asyncHandler( async ( req, res ) => {
    const bookingId = parseInt( req.params.id, 10 );
    if ( isNaN( bookingId ) ) return response( res, false, 400, 'Invalid booking id' );

    // ── Load booking ──────────────────────────────────────────────────────────
    const { data: booking, error: bookingErr } = await supabase
        .from( 'bookings' )
        .select( '*' )
        .eq( 'id', bookingId )
        .single();

    if ( bookingErr || !booking ) return response( res, false, 404, 'Booking not found' );

    if ( booking.status !== 'reviewed' ) {
        return response( res, false, 409, `Cannot confirm: booking is '${booking.status}'. Run /review first.` );
    }

    // ── Load passengers ───────────────────────────────────────────────────────
    const { data: passengers, error: passengerErr } = await supabase
        .from( 'booking_passengers' )
        .select( '*' )
        .eq( 'booking_id', bookingId )
        .order( 'is_lead', { ascending: false } );   // lead passenger first

    if ( passengerErr ) throw passengerErr;
    if ( !passengers?.length ) {
        return response( res, false, 400, 'No passengers found for this booking' );
    }

    // ── Run orchestration ─────────────────────────────────────────────────────
    const result = await orchestrateBooking( {
        booking,
        passengers,
    } );

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
//
// Returns the booking record along with all passengers.

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
//
// Returns a summary list of bookings (newest first).
// Intentionally omits passenger details for list performance.
// TODO: filter by req.user.id once auth is enabled.

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
