import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for search endpoints.
 * 10 requests per minute per IP.
 */
export const searchLimiter = rateLimit( {
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
    },
} );

/**
 * Rate limiter for booking endpoints.
 * 5 booking attempts per day per IP.
 */
export const bookingLimiter = rateLimit( {
    windowMs: 24 * 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Booking limit reached. Please try again tomorrow.' },
    },
} );
