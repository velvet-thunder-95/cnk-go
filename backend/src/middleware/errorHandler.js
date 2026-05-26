/**
 * Global Express error handler (must be 4-arg to be recognised by Express).
 * Registered last in src/index.js — catches everything forwarded via next(err).
 * Never sends stack traces or internal details to clients.
 */
 
export function globalErrorHandler( err, _req, res, _next ) {
    console.error( '[error]', err );

    // Axios / TripJack network errors
    if ( err.isAxiosError ) {
        const status = err.response?.status ?? 502;
        
        return res.status( status ).json( {
            success: false,
            error: { code: 'UPSTREAM_ERROR', message: 'External API error' },
        } );
    }

    const httpStatus = err.status ?? err.statusCode ?? 500;
    res.status( httpStatus ).json( {
        success: false,
        error: {
            code: err.code ?? 'INTERNAL_ERROR',
            message: err.expose ? err.message : 'Internal server error',
        },
    } );
}
