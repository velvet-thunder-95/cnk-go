import { AuthError } from '@supabase/supabase-js';
import response from '../utils/response.js';

/**
 * Wraps an async route handler and forwards any thrown error to next().
 * @param {Function} fn - async (req, res, next) handler
 * @returns {Function} Express middleware
 */
export const asyncHandler = fn => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Global Express error handler.
 * Registered last in src/index.js — catches everything forwarded via next(err).
 * Never sends stack traces or internal error details to clients.
 * @param {Error} err
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {Function} _next
 */
export function globalErrorHandler(err, _req, res, _next) {
    console.error('[error]', err);

    // Supabase auth errors
    if (err instanceof AuthError) {
        return response(res, false, err.status || 401, err.message);
    }

    // Axios / TripJack network errors
    if (err.isAxiosError) {
        const status = err.response?.status ?? 502;
        const tjErrors = err.response?.data?.errors;
        const message = tjErrors?.[0]?.message
            ?? err.response?.data?.message
            ?? 'External API request failed';
        
        return response(res, false, status, message, tjErrors ? { errors: tjErrors } : undefined);
    }

    // Postgres unique-constraint violation
    if (err.code === '23505') {
        return response(res, false, 409, 'Duplicate entry — record already exists');
    }

    // Custom errors thrown with { statusCode, message, expose }
    const httpStatus = err.statusCode ?? err.status ?? 500;
    const message = err.expose ? err.message : 'Something went wrong!';

    return response(res, false, httpStatus, message);
}
