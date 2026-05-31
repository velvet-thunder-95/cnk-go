import { Router } from 'express';
import {
    listHotels,
    priceHotel,
    reviewHotel,
    bookHotel,
    getBookingDetails,
    cancelHotel,
    getHotelsFromDB,
    fetchHotels,
} from '../controllers/hotels.js';

const router = Router();

// POST /api/hotels/list                    — H1: Listing (indicative prices)
router.post('/list', listHotels);

// POST /api/hotels/price                   — H2: Pricing (authoritative, full options)
router.post('/price', priceHotel);

// POST /api/hotels/review                  — H3: Review (get booking token)
router.post('/review', reviewHotel);

// POST /api/hotels/book                    — H4: Book (Hold or Instant)
router.post('/book', bookHotel);

// GET  /api/hotels/booking-details/:bookingId — Poll status
router.get('/booking-details/:bookingId', getBookingDetails);

// POST /api/hotels/cancel                  — Cancel booking
router.post('/cancel', cancelHotel);

// POST /api/hotels/fetch-hotels                — H0: One-time fetch of all hotels (static details)
router.post('/fetch-hotels', fetchHotels);

// GET /api/hotels/get-hotels                — Get all hotels from DB (for admin)
router.get('/get-hotels', getHotelsFromDB);

export default router;
