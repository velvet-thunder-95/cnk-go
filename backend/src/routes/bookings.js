import { Router } from 'express';
import {
    initiateBooking,
    reviewBooking,
    confirmBooking,
    getBooking,
    listBookings,
} from '../controllers/bookings.js';

const router = Router();

// POST /api/bookings                — Step 1: save passengers + create booking record
router.post( '/', initiateBooking );

// POST /api/bookings/:id/review     — Step 2: live review + final price lock
router.post( '/:id/review', reviewBooking );

// POST /api/bookings/:id/confirm    — Step 3: orchestrate hotel → flight booking
router.post( '/:id/confirm', confirmBooking );

// GET  /api/bookings/:id            — Fetch one booking (with passengers)
router.get( '/:id', getBooking );

// GET  /api/bookings                — List all bookings (summary, newest first)
router.get( '/', listBookings );

export default router;
