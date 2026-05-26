import supabase from '../config/supabaseClient.js';

/**
 * Verifies the Supabase JWT sent as `Authorization: Bearer <token>`.
 * Attaches the authenticated user to req.user on success.
 * Apply to all booking routes: router.use(asyncHandler(authMiddleware))
 */
export async function authMiddleware( req, res, next ) {
    const authHeader = req.headers.authorization;

    if ( !authHeader?.startsWith( 'Bearer ' ) ) {
        return res.status( 401 ).json( {
            success: false,
            error: { code: 'UNAUTHENTICATED', message: 'Missing or malformed Authorization header' },
        } );
    }

    const token = authHeader.split( ' ' )[ 1 ];
    const { data: { user }, error } = await supabase.auth.getUser( token );

    if ( error || !user ) {
        return res.status( 401 ).json( {
            success: false,
            error: { code: 'UNAUTHENTICATED', message: 'Invalid or expired token' },
        } );
    }

    req.user = user;
    next();
}
