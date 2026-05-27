import { Router } from 'express';
import { searchDestinations, getCalendar } from '../controllers/packages.js';

const router = Router();

// GET /api/packages/search  — Mode 1: pick a date, see all destinations
router.get('/search', searchDestinations);

// GET /api/packages/calendar — Mode 2: pick a destination, see cheapest weeks
router.get('/calendar', getCalendar);

export default router;
