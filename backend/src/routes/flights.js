import { Router } from 'express';
import {
    searchFlights,
    reviewFlight,
    fareValidateFlight,
    bookFlight,
    getBookingDetails,
    cancelFlight,
} from '../controllers/flights.js';

const router = Router();

// POST /api/flights/search          — TripJack search + upsert to flight_price_cache
router.post('/search', searchFlights);

// POST /api/flights/review          — Price lock; returns bookingId session token
router.post('/review', reviewFlight);

// POST /api/flights/fare-validate   — Optional pre-book fare validation
router.post('/fare-validate', fareValidateFlight);

// POST /api/flights/book            — Confirm reservation
router.post('/book', bookFlight);

// GET  /api/flights/booking-details/:bookingId — Poll for status + PNR
router.get('/booking-details/:bookingId', getBookingDetails);

// POST /api/flights/cancel          — Full refund via submit-amendment
router.post('/cancel', cancelFlight);

export default router;
