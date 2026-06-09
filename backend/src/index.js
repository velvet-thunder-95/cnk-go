import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import logger from './logger.js';
import cookieParser from 'cookie-parser';
import supabase from './config/supabaseClient.js';
import { globalErrorHandler } from './middleware/errorHandler.js';
import response from './utils/response.js';
import packagesRouter from './routes/packages.js';
import flightsRouter from './routes/flights.js';
import hotelsRouter from './routes/hotels.js';
import authRouter from './routes/auth.js';
import userRouter from './routes/user.js';
import bookingsRouter from './routes/bookings.js';
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
app.use( pinoHttp( {
    logger,

    customSuccessMessage: ( req, res ) =>
        `${req.method} ${req.url} ${res.statusCode}`,

    customErrorMessage: ( req, res ) =>
        `${req.method} ${req.url} ${res.statusCode}`,

    // Smart log levels based on status code
    customLogLevel: ( req, res, err ) => {
        if ( res.statusCode >= 500 || err ) return 'error';
        if ( res.statusCode >= 400 ) return 'warn';

        return 'info';
    },

    serializers: {
        req: () => undefined,
        res: () => undefined,
    },
} ) );
app.use( cookieParser() );

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
app.use( '/api/bookings', bookingsRouter );
// app.use('/api/admin',    adminRouter);

// ─── auth ────────────────────────────────────────────────────────────────────
app.use( '/api/auth', authRouter )

// ─── user ────────────────────────────────────────────────────────────────────
app.use( '/api/user', userRouter )

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use( ( _req, res ) => {
    response( res, false, 404, 'Route not found' );
} );

// ─── Global error handler (must be 4-arg) ────────────────────────────────────
app.use( globalErrorHandler );

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

async function start() {
    try {
        logger.info( 'Connecting to database...' );
        // Ping a real table to confirm DB connectivity
        const { error } = await supabase.from( 'origin_cities' ).select( 'id' ).limit( 1 );
        if ( error ) throw error;
        logger.info( 'Database connected.\n' );
    } catch ( err ) {
        logger.error( { err }, 'Failed to connect to database' );
        process.exit( 1 );
    }

    app.listen( PORT, () => {
        logger.info( `[server] Running on port ${PORT} (${process.env.NODE_ENV || 'development'})` );
        logger.info( `Full url: http://localhost:${PORT}` );
    } );
}

start();
