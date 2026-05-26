import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import supabase from './config/supabaseClient.js';
import { globalErrorHandler } from './middleware/errorHandler.js';
import { searchLimiter, bookingLimiter } from './middleware/rateLimiter.js';

const app = express();

// ─── Security middleware ──────────────────────────────────────────────────────
app.use( helmet() );
app.use( cors( {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
} ) );

// ─── Request parsing & logging ────────────────────────────────────────────────
app.use( express.json() );
app.use( morgan( process.env.NODE_ENV === 'production' ? 'combined' : 'dev' ) );

// ─── Health / root ────────────────────────────────────────────────────────────
app.get( '/', ( _req, res ) => {
    res.json( { name: 'cnk-go-api', status: 'ok', version: '1.0.0' } );
} );

app.get( '/health', ( _req, res ) => {
    res.json( { status: 'ok', ts: new Date().toISOString() } );
} );

// ─── Feature routes (uncomment as each ticket is built) ──────────────────────
// import searchRoutes  from './routes/search.js';
// import bookingRoutes from './routes/bookings.js';
// import adminRoutes   from './routes/admin.js';

// app.use( '/api/search',   searchLimiter,  searchRoutes );
// app.use( '/api/bookings', bookingLimiter, bookingRoutes );
// app.use( '/api/admin',                   adminRoutes );

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use( ( _req, res ) => {
    res.status( 404 ).json( { success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } } );
} );

// ─── Global error handler (must be 4-arg) ────────────────────────────────────
app.use( globalErrorHandler );

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

async function start() {
    try {
        console.log( 'Connecting to database...' );
        const { error } = await supabase.from( 'health' ).select( '*' ).limit( 1 ).maybeSingle();
        if ( error ) throw error;
        console.log( 'Database connected.\n' );
    } catch ( err ) {
        console.error( 'Failed to connect to database:', err.message );
        process.exit( 1 );
    }

    app.listen( PORT, () => {
        console.log( `[server] Running on port ${PORT} (${process.env.NODE_ENV || 'development'})` );
        console.log( `Full url: http://localhost:${PORT}` );
    } );
}

start();
