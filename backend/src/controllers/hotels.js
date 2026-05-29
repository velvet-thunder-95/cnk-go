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

// ─── POST /api/hotels/fetch-hotels ────────────────────────────────────────────────────
// H0 — One time setup , fetches all the static details of the hotels available in the api 
// Body: {nextPageToken?} - pagination token for fetching next set of hotels , for ther first call it should be null or undefined , then it will return the nextPageToken in response which can be used for next call to fetch next set of hotels
export const fetchHotels = asyncHandler(async (_req, res) => {
    let allRows = [];

    const imap = new Map();
    destinations.forEach((i) =>
        imap.set(i.cityName, { "5star": 0, "4star": 0, "3star": 0 })
    );

    let next = null;
    let pageCount = 0;

    do {
        pageCount++;
        const { data, nextToken } = await hotelClient.fetchHotels(next);
        next = nextToken;

        if (!data?.length) break;

        for (const i of data) {
            const cityName = i.address?.city?.name;
            if (!cityName || !imap.has(cityName)) continue;

            const rating = i.rating;
            const val = imap.get(cityName);

            const inDemand =
                (rating === 3 && val["3star"] < 5) ||
                (rating === 4 && val["4star"] < 5) ||
                (rating === 5 && val["5star"] < 5);

            if (!inDemand) continue;

            allRows.push({
                tj_hotel_id    : i.tjHotelId,
                name           : i.name,
                rating         : i.rating,
                country_name   : i.countryName                    ?? null,
                country_code   : i.address?.country?.code         ?? null,
                contact_number : i.contact?.ph                    ?? null,
                latitude       : i.geolocation?.ln                ?? null,
                longitude      : i.geolocation?.lt                ?? null,
                address_1      : i.address?.adr                   ?? null,
                postal_code    : i.address?.postalCode            ?? null,
                city           : i.address?.city?.name            ?? null,
                state          : i.address?.state?.name           ?? null,
                images         : i.images?.map((j) => j.url)      ?? [],
                description    : i.description                    ?? null,
                facilities     : i.facilities?.map((j) => j.name) ?? []
            });

            if (rating === 3) val["3star"]++;
            else if (rating === 4) val["4star"]++;
            else if (rating === 5) val["5star"]++;
        }

        const allFull = [...imap.values()].every(
            (v) => v["3star"] >= 5 && v["4star"] >= 5 && v["5star"] >= 5
        );

        if (pageCount % 100 === 0) {
            const { error } = await supabase
                .from("hotel_details")
                .upsert(allRows, { onConflict: "tj_hotel_id" });
            if (error) throw error;
            allRows = [];
        }

        if (allFull) break;

    } while (next);

    if (allRows.length > 0) {
        const { error } = await supabase
            .from("hotel_details")
            .upsert(allRows, { onConflict: "tj_hotel_id" });
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

    const query = supabase.from("hotel_details").select("*").eq("city", city);
    const { data, error } = await (star ? query.gte("rating", parseInt(star)) : query);

    if (error) throw error;

    return response(res, true, 200, null, { data });
});