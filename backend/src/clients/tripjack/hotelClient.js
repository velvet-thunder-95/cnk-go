import axios from 'axios';
import axiosRetry from 'axios-retry';

// HMS client — hotel search, pricing, review
const hmsClient = axios.create( {
    baseURL: process.env.TRIPJACK_HOTEL_BASE_URL,
    headers: {
        apikey: process.env.TRIPJACK_API_KEY,
        'Content-Type': 'application/json',
    },
    timeout: 15000,
} );

// OMS client — hotel book, booking-details, cancel (OMS domain, not HMS!)
const omsClient = axios.create( {
    baseURL: process.env.TRIPJACK_BASE_URL,
    headers: {
        apikey: process.env.TRIPJACK_API_KEY,
        'Content-Type': 'application/json',
    },
    timeout: 15000,
} );

axiosRetry( hmsClient, { retries: 3, retryDelay: axiosRetry.exponentialDelay } );
axiosRetry( omsClient, { retries: 3, retryDelay: axiosRetry.exponentialDelay } );

// ─── H1: Hotel Listing ────────────────────────────────────────────────────────

/**
 * H1 — List available hotels with indicative prices.
 * Response: hotels[] at ROOT level (NOT searchResult.his[]).
 * @param {string[]} hotelIds       Array of TripJack hotel IDs (tj_hotel_id)
 * @param {string}   checkIn        YYYY-MM-DD
 * @param {string}   checkOut       YYYY-MM-DD
 * @param {object[]} rooms          e.g. [{ adults: 2, children: 0 }]
 * @param {string}   correlationId  Must be consistent across H1/H2/H3
 * @returns {Promise<object>}
 */
export async function listHotels( hotelIds, checkIn, checkOut, rooms, correlationId ) {
    const body = {
        correlationId,
        hids: hotelIds,
        checkIn,
        checkOut,
        rooms,
        currency: 'INR',
        nationality: '106',   // India — string, not integer
    };
    const { data } = await hmsClient.post( '/hms/v3/hotel/listing', body );
    
    return data;
}

// ─── H2: Hotel Pricing ───────────────────────────────────────────────────────

/**
 * H2 — Authoritative pricing for one hotel. Returns full room options (28+).
 * panRequired from this response is authoritative — Listing is unreliable.
 * reviewHash from this response is REQUIRED for H3.
 * @param {string}   hotelId        TripJack hotel ID
 * @param {string}   checkIn
 * @param {string}   checkOut
 * @param {object[]} rooms
 * @param {string}   correlationId  Same as H1
 * @returns {Promise<object>}
 */
export async function priceHotel( hotelId, checkIn, checkOut, rooms, correlationId ) {
    const body = {
        correlationId,
        hid: hotelId,
        checkIn,
        checkOut,
        rooms,
        currency: 'INR',
        nationality: '106',
    };
    const { data } = await hmsClient.post( '/hms/v3/hotel/pricing', body );
    
    return data;
}

// ─── H3: Hotel Review ─────────────────────────────────────────────────────────

/**
 * H3 — Get booking token (bookingId) for use in H4.
 * If priceChanged = true, show confirmation dialog to user.
 * @param {string} optionId       Chosen from H2 options
 * @param {string} reviewHash     From H2 response — never discard
 * @param {string} hotelId        TripJack hotel ID
 * @param {string} correlationId  Same as H1/H2
 * @returns {Promise<object>}
 */
export async function reviewHotel( optionId, reviewHash, hotelId, correlationId ) {
    const body = {
        correlationId,
        optionId,
        reviewHash,
        hid: hotelId,
    };
    const { data } = await hmsClient.post( '/hms/v3/hotel/review', body );
    
    return data;
}

// ─── H4: Hotel Book ───────────────────────────────────────────────────────────

/**
 * H4 — Book the hotel. Uses OMS domain (apitest.tripjack.com), NOT HMS.
 * Omit paymentInfos entirely for Hold Booking.
 * @param {string}   bookingId   From H3 Review
 * @param {object[]} travellers  Room traveller info array
 * @param {{ emails: string[], contacts: string[], code: string[] }} delivery
 * @param {number|null} amount   Total price (null → Hold Booking)
 * @returns {Promise<object>}
 */
export async function bookHotel( bookingId, travellers, delivery, amount ) {
    const body = {
        bookingId,
        type: 'HOTEL',
        roomTravellerInfo: travellers,
        deliveryInfo: delivery,
    };
    // Only add paymentInfos for instant booking; omit entirely for Hold Booking
    if ( amount !== null && amount !== undefined ) {
        body.paymentInfos = [ { amount } ];
    }
    const { data } = await omsClient.post( '/oms/v3/hotel/book', body );
    
    return data;
}

// ─── Hotel Booking Details ────────────────────────────────────────────────────

/**
 * Poll booking details. Poll every 5s while isSystemPending = true (max 180s).
 * Post-cancel: response may be empty — handle gracefully (treat as CANCELLED).
 * @param {string} bookingId  TripJack hotel booking ID
 * @returns {Promise<object>}
 */
export async function getHotelBookingDetails( bookingId ) {
    const { data } = await omsClient.post( '/oms/v3/hotel/booking-details', { bookingId } );
    
    return data;
}

// ─── Hotel Cancel ─────────────────────────────────────────────────────────────

/**
 * Cancel a hotel booking.
 * bookingId goes in the URL PATH — body is empty.
 * @param {string} bookingId  tj_hotel_booking_id
 * @returns {Promise<object>}
 */
export async function cancelHotel( bookingId ) {
    const { data } = await omsClient.post( `/oms/v3/hotel/cancel-booking/${bookingId}` );
    
    return data;
}

// ─── Hotel Details ─────────────────────────────────────────────────────────────
/**
 * Fetch static hotel catalogue with pagination.
 * Used in one-time setup to populate the hotels table.
 * @param {string|null} next  Pagination cursor from previous response (null for first page)
 * @returns {Promise<{ data: object[], nextToken: string|null }>}
 */
export async function fetchHotels(next) {
    const res = await omsClient.post(
        `/hms/v3/fetch-static-hotels`,
        next ? { next } : {},
        { timeout: 60000 }
    );

    return {
        data: res.data.hotelOpInfos,
        nextToken: res.data.next,
    };
}
