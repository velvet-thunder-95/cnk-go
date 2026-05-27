import supabase from '../config/supabaseClient.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import response from '../utils/response.js';
import { calculatePerPerson, getPriceTier, minRooms } from '../utils/priceCalculator.js';
import { isStale } from '../utils/dateHelpers.js';
import { CHILD_FARE_RATIO } from '../utils/constants.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePositiveInt(val) {
    const n = parseInt(val, 10);
    
    return isNaN(n) || n < 0 ? NaN : n;
}

// ─── GET /api/packages/search ─────────────────────────────────────────────────
// Mode 1 — "I know when, show me where"
// Query: origin, date (YYYY-MM-DD), nights, adults, [children], [rooms], [stars]
// Returns: all destinations priced from origin on that date, sorted cheapest first.

export const searchDestinations = asyncHandler(async (req, res) => {
    const { origin, date, nights, adults, children = '0', rooms, stars } = req.query;

    if (!origin) return response(res, false, 400, 'origin is required (IATA code, e.g. DEL)');
    if (!date) return response(res, false, 400, 'date is required (YYYY-MM-DD)');
    if (!nights) return response(res, false, 400, 'nights is required');
    if (!adults) return response(res, false, 400, 'adults is required');

    const parsedNights = parsePositiveInt(nights);
    const parsedAdults = parsePositiveInt(adults);
    const parsedChildren = parsePositiveInt(children);
    const parsedRooms = rooms ? parsePositiveInt(rooms) : undefined;
    const parsedStars = stars ? parsePositiveInt(stars) : undefined;

    if (isNaN(parsedNights) || parsedNights < 1) return response(res, false, 400, 'nights must be a positive integer');
    if (isNaN(parsedAdults) || parsedAdults < 1) return response(res, false, 400, 'adults must be at least 1');
    if (isNaN(parsedChildren)) return response(res, false, 400, 'children must be 0 or more');
    if (parsedRooms !== undefined && parsedRooms < 1) return response(res, false, 400, 'rooms must be at least 1');
    if (parsedStars !== undefined && (parsedStars < 1 || parsedStars > 5)) {
        return response(res, false, 400, 'stars must be between 1 and 5');
    }

    const minimumRooms = minRooms(parsedAdults, parsedChildren);
    const requestedRooms = parsedRooms ?? minimumRooms;
    const actualRooms = Math.max(requestedRooms, minimumRooms);
    const roomsAdjusted = requestedRooms < minimumRooms;
    const originIata = origin.toUpperCase();

    // 1. Cheapest flight from origin on this date (rank = 1)
    const { data: flights, error: flightErr } = await supabase
        .from('flight_price_cache')
        .select('destination_iata, price, airline_name, airline_code, stops, duration_minutes, departure_time, arrival_time, fetched_at')
        .eq('origin_iata', originIata)
        .eq('departure_date', date)
        .eq('rank', 1)
        .not('price', 'is', null);

    if (flightErr) throw flightErr;
    if (!flights.length) return response(res, true, 200, null, []);

    const destIatas = flights.map(f => f.destination_iata);

    // 2. Destination metadata
    const { data: destinations, error: destErr } = await supabase
        .from('destinations')
        .select('id, city_name, country, iata_code, thumbnail_url')
        .in('iata_code', destIatas)
        .eq('is_active', true);

    if (destErr) throw destErr;

    const destByIata = Object.fromEntries(destinations.map(d => [d.iata_code, d]));
    const destIds = destinations.map(d => d.id);

    // 3. Cheapest hotel per destination on this date
    let hotelQuery = supabase
        .from('hotel_price_cache')
        .select('price_per_night, fetched_at, hotels!inner ( id, name, star_rating, destination_id )')
        .eq('check_in_date', date);

    if (parsedStars) hotelQuery = hotelQuery.gte('hotels.star_rating', parsedStars);

    const { data: hotelPrices, error: hotelErr } = await hotelQuery;
    if (hotelErr) throw hotelErr;

    // Keep cheapest hotel per destination
    const destIdSet = new Set(destIds);
    const cheapestByDestId = {};

    for (const row of hotelPrices) {
        const hotel = row.hotels;
        if (!destIdSet.has(hotel.destination_id)) continue;
        const existing = cheapestByDestId[hotel.destination_id];
        if (!existing || row.price_per_night < existing.price_per_night) {
            cheapestByDestId[hotel.destination_id] = {
                name: hotel.name,
                star_rating: hotel.star_rating,
                price_per_night: row.price_per_night,
                fetched_at: row.fetched_at,
            };
        }
    }

    // 4. Assemble results
    const results = [];

    for (const flight of flights) {
        const dest = destByIata[flight.destination_iata];
        if (!dest) continue;

        const hotel = cheapestByDestId[dest.id];
        if (!hotel) continue; // no hotel data = can't quote a package

        const flightTotal = Math.round((flight.price * parsedAdults) + (flight.price * CHILD_FARE_RATIO * parsedChildren));
        const hotelTotal = Math.round(hotel.price_per_night * parsedNights * actualRooms);
        const perPerson = Math.round(
            calculatePerPerson(flight.price, hotel.price_per_night, parsedNights, actualRooms, parsedAdults, parsedChildren),
        );

        results.push({
            destination: {
                id: dest.id,
                name: dest.city_name,
                country: dest.country,
                iata_code: dest.iata_code,
                thumbnail_url: dest.thumbnail_url,
            },
            flight: {
                price_per_adult: flight.price,
                airline_name: flight.airline_name,
                airline_code: flight.airline_code,
                stops: flight.stops,
                duration_minutes: flight.duration_minutes,
                departure_time: flight.departure_time,
                arrival_time: flight.arrival_time,
            },
            hotel: {
                name: hotel.name,
                star_rating: hotel.star_rating,
                price_per_night: hotel.price_per_night,
            },
            pricing: {
                flight_total: flightTotal,
                hotel_total: hotelTotal,
                total: flightTotal + hotelTotal,
                per_person: perPerson,
            },
            stale: isStale(flight.fetched_at) || isStale(hotel.fetched_at),
        });
    }

    results.sort((a, b) => a.pricing.per_person - b.pricing.per_person);

    const warningMessage = roomsAdjusted
        ? `Rooms adjusted to ${actualRooms} to fit ${parsedAdults + parsedChildren} travellers (max 3 per room)`
        : null;

    return response(res, true, 200, warningMessage, results);
});

// ─── GET /api/packages/calendar ───────────────────────────────────────────────
// Mode 2 — "I know where, show me when"
// Query: origin, destination, nights, adults, [children], [rooms]
// Returns: up to 13 weekly tiles colour-coded by price percentile.

export const getCalendar = asyncHandler(async (req, res) => {
    const { origin, destination, nights, adults, children = '0', rooms } = req.query;

    if (!origin) return response(res, false, 400, 'origin is required (IATA code, e.g. DEL)');
    if (!destination) return response(res, false, 400, 'destination is required (IATA code, e.g. DXB)');
    if (!nights) return response(res, false, 400, 'nights is required');
    if (!adults) return response(res, false, 400, 'adults is required');

    const parsedNights = parsePositiveInt(nights);
    const parsedAdults = parsePositiveInt(adults);
    const parsedChildren = parsePositiveInt(children);
    const parsedRooms = rooms ? parsePositiveInt(rooms) : undefined;

    if (isNaN(parsedNights) || parsedNights < 1) return response(res, false, 400, 'nights must be a positive integer');
    if (isNaN(parsedAdults) || parsedAdults < 1) return response(res, false, 400, 'adults must be at least 1');
    if (isNaN(parsedChildren)) return response(res, false, 400, 'children must be 0 or more');
    if (parsedRooms !== undefined && parsedRooms < 1) return response(res, false, 400, 'rooms must be at least 1');

    const minimumRooms = minRooms(parsedAdults, parsedChildren);
    const requestedRooms = parsedRooms ?? minimumRooms;
    const actualRooms = Math.max(requestedRooms, minimumRooms);
    const roomsAdjusted = requestedRooms < minimumRooms;

    const { data: weeks, error } = await supabase
        .from('weekly_price_cache')
        .select('week_start_date, cheapest_date, min_flight_price, cheapest_hotel_per_night, cheapest_airline_name, cheapest_airline_code')
        .eq('origin_iata', origin.toUpperCase())
        .eq('destination_iata', destination.toUpperCase())
        .order('week_start_date', { ascending: true })
        .limit(13);

    if (error) throw error;
    if (!weeks.length) return response(res, true, 200, null, { origin, destination, weeks: [] });

    // Per-person price for each week
    const withPricing = weeks.map(w => {
        const perPerson = w.min_flight_price && w.cheapest_hotel_per_night
            ? Math.round(calculatePerPerson(w.min_flight_price, w.cheapest_hotel_per_night, parsedNights, actualRooms, parsedAdults, parsedChildren))
            : null;
        
        return { ...w, per_person: perPerson };
    });

    // Percentile thresholds for colour coding
    const validPrices = withPricing
        .filter(w => w.per_person !== null)
        .map(w => w.per_person)
        .sort((a, b) => a - b);

    const p33 = validPrices[Math.floor(validPrices.length * 0.33)] ?? 0;
    const p66 = validPrices[Math.floor(validPrices.length * 0.66)] ?? 0;

    const tiles = withPricing.map(w => ({
        week_start_date: w.week_start_date,
        cheapest_date: w.cheapest_date,
        flight_price_per_adult: w.min_flight_price,
        hotel_price_per_night: w.cheapest_hotel_per_night,
        airline_name: w.cheapest_airline_name,
        airline_code: w.cheapest_airline_code,
        per_person: w.per_person,
        color: w.per_person !== null ? getPriceTier(w.per_person, p33, p66) : null,
    }));

    return response(res, true, 200, null, {
        origin,
        destination,
        weeks: tiles,
        warning: roomsAdjusted
            ? `Rooms adjusted to ${actualRooms} to fit ${parsedAdults + parsedChildren} travellers (max 3 per room)`
            : undefined,
        requested_rooms: requestedRooms,
        used_rooms: actualRooms,
    });
});
