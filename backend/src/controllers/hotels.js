import supabase from '../config/supabaseClient.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import response from '../utils/response.js';
import * as hotelClient from '../clients/tripjack/hotelClient.js';
import { generateCorrelationId } from '../utils/priceCalculator.js';

// ─── POST /api/hotels/list ────────────────────────────────────────────────────
// H1 — Hotel Listing. Returns available hotels with indicative prices.
// Body: { hotelIds, checkIn, checkOut, rooms, correlationId? }

export const listHotels = asyncHandler(async (req, res) => {
    const { hotelIds, checkIn, checkOut, rooms, correlationId } = req.body;

    if (!Array.isArray(hotelIds) || !hotelIds.length) {
        return response(res, false, 400, 'hotelIds array is required');
    }
    if (!checkIn) return response(res, false, 400, 'checkIn is required');
    if (!checkOut) return response(res, false, 400, 'checkOut is required');
    if (!Array.isArray(rooms) || !rooms.length) {
        return response(res, false, 400, 'rooms array is required');
    }

    const corrId = correlationId || generateCorrelationId('list');
    const data = await hotelClient.listHotels(hotelIds, checkIn, checkOut, rooms, corrId);

    // Check TripJack body-level error (API returns HTTP 200 but status.success: false)
    if (data.status && !data.status.success) {
        const errMsg = data.errors?.[0]?.message || 'Hotel listing failed at provider';
        
        return response(res, false, 502, errMsg);
    }

    // Hotels are at data.hotels[] — ROOT level (NOT data.searchResult.his[])
    const hotels = data.hotels ?? [];

    // Upsert indicative prices into hotel_price_cache
    if (hotels.length) {
        // Look up DB hotel IDs from tj_hotel_id
        const tjIds = hotels.map(h => h.hotelId);
        const { data: dbHotels, error: lookupErr } = await supabase
            .from('hotels')
            .select('id, tj_hotel_id')
            .in('tj_hotel_id', tjIds);

        if (!lookupErr && dbHotels?.length) {
            const tjToDb = new Map(dbHotels.map(h => [h.tj_hotel_id, h.id]));

            const rows = hotels
                .filter(h => h.options?.[0]?.pricing?.totalPrice && tjToDb.has(h.hotelId))
                .map(h => ({
                    hotel_id: tjToDb.get(h.hotelId),
                    check_in_date: checkIn,
                    price_per_night: h.options[0].pricing.totalPrice,
                    currency: 'INR',
                    fetched_at: new Date().toISOString(),
                }));

            if (rows.length) {
                const { error: upsertErr } = await supabase
                    .from('hotel_price_cache')
                    .upsert(rows, { onConflict: 'hotel_id,check_in_date' });

                if (upsertErr) console.error('[hotels/list] cache upsert error:', upsertErr.message);
            }
        }
    }

    return response(res, true, 200, null, {
        correlation_id: corrId,
        hotels,
    });
});

// ─── POST /api/hotels/price ───────────────────────────────────────────────────
// H2 — Authoritative pricing. Returns full room options (28+) and reviewHash.
// panRequired from this response is AUTHORITATIVE — Listing (H1) is unreliable.
// Body: { hotelId, checkIn, checkOut, rooms, correlationId? }

export const priceHotel = asyncHandler(async (req, res) => {
    const { hotelId, checkIn, checkOut, rooms, correlationId } = req.body;

    if (!hotelId) return response(res, false, 400, 'hotelId is required');
    if (!checkIn) return response(res, false, 400, 'checkIn is required');
    if (!checkOut) return response(res, false, 400, 'checkOut is required');
    if (!Array.isArray(rooms) || !rooms.length) {
        return response(res, false, 400, 'rooms array is required');
    }

    const corrId = correlationId || generateCorrelationId('price');
    const data = await hotelClient.priceHotel(hotelId, checkIn, checkOut, rooms, corrId);

    if (data.status && !data.status.success) {
        const errMsg = data.errors?.[0]?.message || 'Hotel pricing failed at provider';
        
        return response(res, false, 502, errMsg);
    }

    return response(res, true, 200, null, {
        correlation_id: corrId,
        review_hash: data.reviewHash,
        options: data.options,
    });
});

// ─── POST /api/hotels/review ──────────────────────────────────────────────────
// H3 — Get booking token (bookingId). Valid ~5 min. Pass to /book.
// If priceChanged = true → show confirmation dialog before proceeding.
// Body: { hotelId, optionId, reviewHash, correlationId? }

export const reviewHotel = asyncHandler(async (req, res) => {
    const { hotelId, optionId, reviewHash, correlationId } = req.body;

    if (!hotelId) return response(res, false, 400, 'hotelId is required');
    if (!optionId) return response(res, false, 400, 'optionId is required');
    if (!reviewHash) return response(res, false, 400, 'reviewHash is required');

    const corrId = correlationId || generateCorrelationId('review');
    const data = await hotelClient.reviewHotel(optionId, reviewHash, hotelId, corrId);

    if (data.status && !data.status.success) {
        const errMsg = data.errors?.[0]?.message || 'Hotel review failed at provider';
        
        return response(res, false, 502, errMsg);
    }

    return response(res, true, 200, null, {
        booking_id: data.bookingId,
        price_changed: data.priceChanged ?? false,
        onhold_allowed: data.onholdAllowed ?? false,
        deadline: data.option?.deadlineDateTime ?? null,
    });
});

// ─── POST /api/hotels/book ────────────────────────────────────────────────────
// H4 — Book hotel. Uses OMS domain (handled in client).
// Omit amount for Hold Booking (when onholdAllowed was true from H3).
// Body: { bookingId, roomTravellerInfo, delivery, amount? }

export const bookHotel = asyncHandler(async (req, res) => {
    const { bookingId, roomTravellerInfo, delivery, amount } = req.body;

    if (!bookingId) return response(res, false, 400, 'bookingId is required');
    if (!Array.isArray(roomTravellerInfo) || !roomTravellerInfo.length) {
        return response(res, false, 400, 'roomTravellerInfo array is required');
    }
    if (!delivery) return response(res, false, 400, 'delivery is required');

    // amount is optional — omit for Hold Booking
    const data = await hotelClient.bookHotel(bookingId, roomTravellerInfo, delivery, amount ?? null);

    // Check TripJack-level error
    if (data.status && !data.status.success) {
        return response(res, false, 502, data.errors?.[0]?.message || 'Hotel booking failed at provider');
    }

    return response(res, true, 200, null, {
        booking_id: data.bookingId,
        status: data.status,
    });
});

// ─── GET /api/hotels/booking-details/:bookingId ───────────────────────────────
// Poll this after book. Poll every 5s while isSystemPending = true (max 180s).
// Post-cancel: TripJack returns empty body — treat as CANCELLED.

export const getBookingDetails = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    if (!bookingId) return response(res, false, 400, 'bookingId is required');

    const data = await hotelClient.getHotelBookingDetails(bookingId);

    // After cancellation, TripJack returns empty body
    if (!data || Object.keys(data).length === 0) {
        return response(res, true, 200, null, { order_status: 'CANCELLED' });
    }

    return response(res, true, 200, null, {
        booking_id: data.bookingId,
        order_status: data.order?.status ?? (data.status?.httpStatus === 200 ? 'CONFIRMED' : 'UNKNOWN'),
        is_system_pending: data.isSystemPending ?? false,
        raw: data,
    });
});

// ─── POST /api/hotels/cancel ──────────────────────────────────────────────────
// Cancel a hotel booking. bookingId goes in URL path inside hotelClient.
// Body: { bookingId }

export const cancelHotel = asyncHandler(async (req, res) => {
    const { bookingId } = req.body;
    if (!bookingId) return response(res, false, 400, 'bookingId is required');

    const data = await hotelClient.cancelHotel(bookingId);

    if (data.status && !data.status.success) {
        return response(res, false, 502, data.errors?.[0]?.message || 'Hotel cancellation failed at provider');
    }

    return response(res, true, 200, 'Hotel booking cancelled successfully');
});
