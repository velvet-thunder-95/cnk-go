/**
 * Wraps async route handlers so errors are forwarded to the global error handler.
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }));
 *
 * @param {Function} fn  Async route handler
 * @returns {Function}
 */
const asyncHandler = fn => ( req, res, next ) =>
    Promise.resolve( fn( req, res, next ) ).catch( next );

export default asyncHandler;
