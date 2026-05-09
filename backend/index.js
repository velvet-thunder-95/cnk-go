import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import supabase from './config/supabaseClient.js';

const app = express();

app.use( cors() );
app.use( morgan( process.env.NODE_ENV === 'production' ? 'combined' : 'dev' ) );
app.use( express.json() );

// --- Routes ---
app.get( '/', ( _req, res ) => {
    res.json( { name: 'cnk-go-api', status: 'ok', version: '1.0.0' } );
} );

app.get( '/health', ( _req, res ) => {
    res.json( { status: 'ok', ts: new Date().toISOString() } );
} );

// TODO: mount feature routes here as they are built
// import searchRoutes from './routes/search.js';
// import bookingRoutes from './routes/bookings.js';
// app.use('/api/search', searchRoutes);
// app.use('/api/bookings', bookingRoutes);

// --- 404 ---
app.use(( _req, res ) => {
    res.status( 404 ).json( { error: 'Not found' } );
} );

// --- Global error handler ---
app.use( ( err, _req, res, _next ) => {
    console.error( err );
    res.status( 500 ).json( { error: 'Internal server error' } );
} );

const PORT = process.env.PORT || 4000;

async function start() {
    try {
        console.log( 'Connecting to database...' );
        const { error } = await supabase.from('health').select('*').limit(1).maybeSingle();
        if (error) throw error;
        console.log('Database connected.\n'); 
    } catch ( err ) {
        console.error( 'Failed to connect to database:', err.message );
        process.exit( 1 );
    }

    app.listen( PORT, () => {
        console.log( `[server] Running on port ${PORT} (${process.env.NODE_ENV || 'development'})` );
        console.log( 'Full url: http://localhost:' + PORT );
    } );
}

start();
