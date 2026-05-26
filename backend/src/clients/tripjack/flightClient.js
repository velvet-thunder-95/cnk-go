import axios from 'axios';
import axiosRetry from 'axios-retry';

const client = axios.create( {
    baseURL: process.env.TRIPJACK_BASE_URL,
    headers: {
        apikey: process.env.TRIPJACK_API_KEY,
        'Content-Type': 'application/json',
    },
    timeout: 15000,
} );

axiosRetry( client, { retries: 3, retryDelay: axiosRetry.exponentialDelay } );

// ─── Flight Search ────────────────────────────────────────────────────────────

/**
 * Search round-trip flights (international — uses COMBO[] key).
 * @param {string} origin       Origin IATA code
 * @param {string} dest         Destination IATA code
 * @param {string} departDate   Departure date (YYYY-MM-DD)
 * @param {string} returnDate   Return date (YYYY-MM-DD)
 * @param {{ ADULT: number, CHILD: number }} pax  Passenger counts
 * @returns {Promise<object>}   Raw TripJack search response
 */
export async function searchFlights( origin, dest, departDate, returnDate, pax ) {
    const body = {
        searchQuery: {
            cabinClass: 'ECONOMY',
            paxInfo: {
                ADULT: String( pax.ADULT ),
                CHILD: String( pax.CHILD ?? 0 ),
                INFANT: '0',
            },
            routeInfos: [
                {
                    fromCityOrAirport: { code: origin },
                    toCityOrAirport: { code: dest },
                    travelDate: departDate,
                },
                {
                    fromCityOrAirport: { code: dest },
                    toCityOrAirport: { code: origin },
                    travelDate: returnDate,
                },
            ],
            searchModifiers: {
                isDirectFlight: false,
                isConnectingFlight: false,
                pft: 'REGULAR',
            },
        },
    };
    const { data } = await client.post( '/fms/v1/air-search-all', body );
    
    return data;
}

// ─── Flight Review ────────────────────────────────────────────────────────────

/**
 * Review a flight price — confirms fare and returns bookingId session token.
 * bookingId is at ROOT of response (not inside tripInfos).
 * @param {string} priceId  From combo.totalPriceList[0].id (lowercase)
 * @returns {Promise<object>}
 */
export async function reviewFlight( priceId ) {
    const { data } = await client.post( '/fms/v1/review', { priceIds: [ priceId ] } );
    
    return data;
}

// ─── Flight Book ──────────────────────────────────────────────────────────────

/**
 * Book a flight. Do NOT include pid in travellerInfo objects.
 * @param {string}   bookingId   From Review response root
 * @param {number}   amount      Total fare from Review (numeric, not string)
 * @param {object[]} travellers  Passenger details array
 * @param {{ emails: string[], contacts: string[] }} delivery
 * @returns {Promise<object>}
 */
export async function bookFlight( bookingId, amount, travellers, delivery ) {
    const body = {
        bookingId,
        paymentInfos: [ { amount } ],
        travellerInfo: travellers,
        deliveryInfo: delivery,
    };
    const { data } = await client.post( '/oms/v1/air/book', body );
    
    return data;
}

// ─── Flight Booking Details ───────────────────────────────────────────────────

/**
 * Poll booking details for status and PNR.
 * PNR is at: res.itemInfos.AIR.travellerInfos[0].pnrDetails (keyed map).
 * @param {string} bookingId
 * @returns {Promise<object>}
 */
export async function getFlightBookingDetails( bookingId ) {
    const { data } = await client.post( '/oms/v1/booking-details', { bookingId } );
    
    return data;
}

// ─── Flight Cancel ────────────────────────────────────────────────────────────

/**
 * Cancel a flight booking (full refund).
 * Uses submit-amendment endpoint — NOT /oms/v1/air/cancel.
 * @param {string} bookingId
 * @returns {Promise<object>}
 */
export async function cancelFlight( bookingId ) {
    const body = {
        bookingId,
        type: 'FULL_REFUND',
        remarks: 'Customer cancellation',
    };
    const { data } = await client.post( '/oms/v1/air/amendment/submit-amendment', body );
    
    return data;
}
