import supabase from '../config/supabaseClient.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import response from '../utils/response.js';
import * as flightClient from '../clients/tripjack/flightClient.js';
import { TOP_N_FLIGHTS } from '../utils/constants.js';

// ─── POST /api/flights/search ─────────────────────────────────────────────────
// Calls TripJack, parses COMBO[], de-dupes by airline, caches top N, returns results.
// Body: { origin, destination, departDate, returnDate, adults, children }

export const searchFlights = asyncHandler(async (req, res) => {
    const { origin, destination, departDate, returnDate, adults = 1, children = 0 } = req.body;

    if (!origin) return response(res, false, 400, 'origin is required');
    if (!destination) return response(res, false, 400, 'destination is required');
    if (!departDate) return response(res, false, 400, 'departDate is required (YYYY-MM-DD)');
    if (!returnDate) return response(res, false, 400, 'returnDate is required (YYYY-MM-DD)');

    const parsedAdults = parseInt(adults, 10);
    const parsedChildren = parseInt(children, 10);

    if (isNaN(parsedAdults) || parsedAdults < 1) return response(res, false, 400, 'adults must be at least 1');
    if (isNaN(parsedChildren) || parsedChildren < 0) return response(res, false, 400, 'children must be 0 or more');

    const pax = { ADULT: String(parsedAdults), CHILD: String(parsedChildren), INFANT: '0' };

    const data = await flightClient.searchFlights(
        origin.toUpperCase(),
        destination.toUpperCase(),
        departDate,
        returnDate,
        pax,
    );

    // Check TripJack body-level error (API returns HTTP 200 but status.success: false)
    if (data.status && !data.status.success) {
        const errMsg = data.errors?.[0]?.message || 'Flight search failed at provider';
        
        return response(res, false, 502, errMsg);
    }

    // Parse international round-trip COMBO[]
    const combos = data.searchResult?.tripInfos?.COMBO ?? [];

    // De-duplicate: cheapest per airline, then take top N
    const byAirline = new Map();
    for (const combo of combos) {
        const priceEntry = combo.totalPriceList?.[0];
        const price = priceEntry?.fd?.ADULT?.fC?.TF;
        const airlineCode = combo.sI?.[0]?.fD?.aI?.code;
        if (!price || !airlineCode) continue;

        const existing = byAirline.get(airlineCode);
        if (!existing || price < existing.price) {
            byAirline.set(airlineCode, {
                price,
                price_id: priceEntry.id,          // lowercase .id — critical
                airline_code: airlineCode,
                airline_name: combo.sI[0]?.fD?.aI?.name,
                duration_minutes: combo.sI[0]?.duration,
                stops: combo.sI[0]?.stops ?? 0,
                departure_time: combo.sI[0]?.dt?.slice(11, 16),
                arrival_time: combo.sI[0]?.at?.slice(11, 16),
            });
        }
    }

    const sorted = Array.from(byAirline.values())
        .sort((a, b) => a.price - b.price)
        .slice(0, TOP_N_FLIGHTS);

    const shouldCache = parsedAdults === 1 && parsedChildren === 0;

    // Upsert top N into flight_price_cache only for canonical cache shape (1 adult, 0 child)
    if (shouldCache && sorted.length) {
        const rows = sorted.map((opt, idx) => ({
            origin_iata: origin.toUpperCase(),
            destination_iata: destination.toUpperCase(),
            departure_date: departDate,
            return_date: returnDate,
            rank: idx + 1,
            price: opt.price,
            airline_name: opt.airline_name,
            airline_code: opt.airline_code,
            duration_minutes: opt.duration_minutes,
            stops: opt.stops,
            departure_time: opt.departure_time,
            arrival_time: opt.arrival_time,
            result_count: idx === 0 ? combos.length : null,
            fetched_at: new Date().toISOString(),
        }));

        const { error: upsertErr } = await supabase
            .from('flight_price_cache')
            .upsert(rows, { onConflict: 'origin_iata,destination_iata,departure_date,rank' });

        if (upsertErr) console.error('[flights] cache upsert error:', upsertErr.message);
    }

    // Prune stale higher ranks when fewer fresh options are returned for this route-date.
    if (shouldCache) {
        const { error: deleteErr } = await supabase
            .from('flight_price_cache')
            .delete()
            .eq('origin_iata', origin.toUpperCase())
            .eq('destination_iata', destination.toUpperCase())
            .eq('departure_date', departDate)
            .gt('rank', sorted.length);

        if (deleteErr) console.error('[flights] stale rank prune error:', deleteErr.message);
    }

    const message = shouldCache
        ? `Found ${combos.length} results, cached top ${sorted.length}`
        : `Found ${combos.length} results, skipped cache write for pax ${parsedAdults}A-${parsedChildren}C`;

    return response(res, true, 200, message, sorted);
});

// ─── POST /api/flights/review ─────────────────────────────────────────────────
// Body: { priceId }
// Returns: bookingId (session token), confirmed total fare, session TTL.

export const reviewFlight = asyncHandler(async (req, res) => {
    const { priceId } = req.body;
    if (!priceId) return response(res, false, 400, 'priceId is required');

    const data = await flightClient.reviewFlight(priceId);

    if (data.status && !data.status.success) {
        const errMsg = data.errors?.[0]?.message || 'Flight review failed at provider';
        
        return response(res, false, 502, errMsg);
    }

    return response(res, true, 200, null, {
        booking_id: data.bookingId,                            // ROOT level — not inside tripInfos
        total_fare: data.totalPriceInfo?.totalFareDetail?.fC?.TF,
        session_ttl_seconds: data.conditions?.st,
    });
});

// ─── POST /api/flights/fare-validate ─────────────────────────────────────────
// Optional v2.0 pre-book validation step to catch fare changes before /book.
// Body: { bookingId, amount, travellers, delivery }

export const fareValidateFlight = asyncHandler(async (req, res) => {
    const { bookingId, amount, travellers, delivery } = req.body;

    if (!bookingId) return response(res, false, 400, 'bookingId is required');
    if (amount === undefined || amount === null) return response(res, false, 400, 'amount is required');
    if (!travellers?.length) return response(res, false, 400, 'travellers array is required');
    if (!delivery) return response(res, false, 400, 'delivery is required');

    const data = await flightClient.fareValidateFlight(bookingId, amount, travellers, delivery);

    if (data.status && !data.status.success) {
        return response(res, false, 502, data.errors?.[0]?.message || 'Fare validation failed at provider');
    }

    return response(res, true, 200, null, {
        booking_id: data.bookingId,
        total_fare: data.totalPriceInfo?.totalFareDetail?.fC?.TF,
        alerts: data.alerts ?? [],
        conditions: data.conditions ?? null,
    });
});

// ─── POST /api/flights/book ───────────────────────────────────────────────────
// Body: { bookingId, amount, travellers, delivery }
// travellers: array of passenger objects (no pid field!)
// delivery: { emails: [], contacts: [] }

export const bookFlight = asyncHandler(async (req, res) => {
    const { bookingId, amount, travellers, delivery } = req.body;

    if (!bookingId) return response(res, false, 400, 'bookingId is required');
    if (amount === undefined || amount === null) return response(res, false, 400, 'amount is required');
    if (!travellers?.length) return response(res, false, 400, 'travellers array is required');
    if (!delivery) return response(res, false, 400, 'delivery is required');

    const data = await flightClient.bookFlight(bookingId, amount, travellers, delivery);

    if (data.status && !data.status.success) {
        return response(res, false, 502, data.errors?.[0]?.message || 'Flight booking failed at provider');
    }

    return response(res, true, 200, null, {
        booking_id: data.bookingId,
        status: data.status,
    });
});

// ─── GET /api/flights/booking-details/:bookingId ──────────────────────────────
// Poll this after book to get status and PNR.
// PNR is at: res.itemInfos.AIR.travellerInfos[0].pnrDetails (map keyed by route)

export const getBookingDetails = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    if (!bookingId) return response(res, false, 400, 'bookingId is required');

    const data = await flightClient.getFlightBookingDetails(bookingId);

    if (data.status && !data.status.success) {
        return response(res, false, 502, data.errors?.[0]?.message || 'Failed to fetch booking details');
    }

    const order = data.order;
    const pnrDetails = data.itemInfos?.AIR?.travellerInfos?.[0]?.pnrDetails ?? null;

    return response(res, true, 200, null, {
        booking_id: data.bookingId,
        order_status: order?.status ?? 'UNKNOWN',
        pnr_details: pnrDetails,
        raw: data,
    });
});

// ─── POST /api/flights/cancel ─────────────────────────────────────────────────
// Body: { bookingId }
// Uses submit-amendment with type: FULL_REFUND (not /cancel endpoint)

export const cancelFlight = asyncHandler(async (req, res) => {
    const { bookingId } = req.body;
    if (!bookingId) return response(res, false, 400, 'bookingId is required');

    const data = await flightClient.cancelFlight(bookingId);

    if (data.status && !data.status.success) {
        return response(res, false, 502, data.errors?.[0]?.message || 'Flight cancellation failed at provider');
    }

    return response(res, true, 200, 'Flight cancellation submitted successfully', data);
});
