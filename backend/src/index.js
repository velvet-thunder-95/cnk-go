import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import supabase from './config/supabaseClient.js';
import { globalErrorHandler } from './middleware/errorHandler.js';
import response from './utils/response.js';
import packagesRouter from './routes/packages.js';
import flightsRouter from './routes/flights.js';
import hotelsRouter from './routes/hotels.js';
// import bookingsRouter from './routes/bookings.js';
// import adminRouter    from './routes/admin.js';

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

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use( '/api/packages', packagesRouter );
app.use( '/api/flights', flightsRouter );
app.use( '/api/hotels', hotelsRouter );
// app.use('/api/bookings', bookingsRouter);
// app.use('/api/admin',    adminRouter);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use(( _req, res ) => {
    response( res, false, 404, 'Route not found' );
});

// ─── Global error handler (must be 4-arg) ────────────────────────────────────
app.use( globalErrorHandler );

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

async function start() {
    try {
        console.log( 'Connecting to database...' );
        // Ping a real table to confirm DB connectivity
        const { error } = await supabase.from( 'origin_cities' ).select( 'id' ).limit( 1 );
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
