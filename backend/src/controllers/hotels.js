import supabase from '../config/supabaseClient.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import response from '../utils/response.js';
import * as hotelClient from '../clients/tripjack/hotelClient.js';
import { generateCorrelationId } from '../utils/priceCalculator.js';
import { destinations } from '../utils/internationalDestinations.js';

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

// ─── POST /api/hotels/fetch-hotels ─────────────────────────────────────────────
// H0 — One-time setup. Fetches the full TripJack hotel catalogue page by page,
// filters for target cities (up to 5 per star rating per city), and upserts into hotels.
export const fetchHotels = asyncHandler(async (_req, res) => {
    let allRows = [];

    const { data: destRows, error: destErr } = await supabase
        .from('destinations')
        .select('id, city_name');
    if (destErr) throw destErr;
    const cityToDestId = new Map(destRows.map(d => [d.city_name, d.id]));

    const cityQuotaMap = new Map();
    destinations.forEach((destination) =>
        cityQuotaMap.set(destination.cityName, { "5star": 0, "4star": 0, "3star": 0 })
    );

    let nextToken = null;
    let pageCount = 0;

    do {
        pageCount++;
        const { data, nextToken: newToken } = await hotelClient.fetchHotels(nextToken);
        nextToken = newToken;

        if (!data?.length) break;

        for (const hotel of data) {
            const cityName = hotel.address?.city?.name;
            if (!cityName || !cityQuotaMap.has(cityName)) continue;

            const rating = hotel.rating;
            const cityQuota = cityQuotaMap.get(cityName);

            const isNeeded =
                (rating === 3 && cityQuota["3star"] < 5) ||
                (rating === 4 && cityQuota["4star"] < 5) ||
                (rating === 5 && cityQuota["5star"] < 5);

            if (!isNeeded) continue;

            allRows.push({
                destination_id  : cityToDestId.get(cityName)                    ?? null,
                tj_hotel_id     : hotel.tjHotelId,
                name            : hotel.name,
                star_rating     : hotel.rating                                   ?? null,
                address         : hotel.address?.adr                             ?? null,
                description     : hotel.description                              ?? null,
                amenities       : hotel.facilities?.map((f) => f.name)          ?? [],
                images          : hotel.images?.map((image) => image.url)       ?? [],
                latitude        : hotel.geolocation?.lt                          ?? null,
                longitude       : hotel.geolocation?.ln                          ?? null,
                is_active       : true,
            });

            if (rating === 3) cityQuota["3star"]++;
            else if (rating === 4) cityQuota["4star"]++;
            else if (rating === 5) cityQuota["5star"]++;
        }

        const allCitiesAtCapacity = [...cityQuotaMap.values()].every(
            (quota) => quota["3star"] >= 5 && quota["4star"] >= 5 && quota["5star"] >= 5
        );

        if (allRows.length >= 50) {
            const { error } = await supabase
                .from('hotels')
                .upsert(allRows, { onConflict: 'tj_hotel_id' });
            if (error) throw error;
            allRows = [];
        }

        if (allCitiesAtCapacity) break;

    } while (nextToken);

    if (allRows.length > 0) {
        const { error } = await supabase
            .from('hotels')
            .upsert(allRows, { onConflict: 'tj_hotel_id' });
        if (error) throw error;
    }

    return response(res, true, 200, 'Hotels fetched and saved successfully', {
        pages_fetched: pageCount,
    });
});

// ─── GET /api/hotels/get-hotels ──────────────────────────────────────────────
// Fetches static hotel details from DB for a given city.
// star param is optional — filters by >= (e.g. star=4 returns 4 and 5 star hotels)
// Query: { city: string (required), star: number (optional, 3–5) }
// example : http://localhost:4000/api/hotels/get-hotels?city=Dubai&star=3
export const getHotelsFromDB = asyncHandler(async (req, res) => {
    const { city, star } = req.query;
    if (!city) return response(res, false, 400, 'city is required');

    const starNum = star ? Number(star) : null;
    if (starNum !== null && (isNaN(starNum) || starNum < 1 || starNum > 5)) {
        return response(res, false, 400, 'star must be an integer between 1 and 5');
    }

    const { data: destRow, error: destErr } = await supabase
        .from('destinations')
        .select('id')
        .eq('city_name', city)
        .single();

    if (destErr || !destRow) return response(res, false, 404, 'City not found');

    const query = supabase
        .from('hotels')
        .select('*')
        .eq('destination_id', destRow.id)
        .eq('is_active', true);

    const { data, error } = await (starNum !== null ? query.gte('star_rating', starNum) : query);

    if (error) throw error;

    return response(res, true, 200, null, { data });
});
