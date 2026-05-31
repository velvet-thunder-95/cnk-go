import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = path.dirname( fileURLToPath( import.meta.url ) );

async function migrate() {
    if ( !process.env.DATABASE_URL ) {
        console.error( 'ERROR: DATABASE_URL is not set.' );
        console.error( 'Copy .env.example to .env and fill in your Supabase connection string.' );
        process.exit( 1 );
    }

    const client = new Client( {
        // Strip sslmode from the connection string — pg v8.20+ treats sslmode=require
        // as verify-full and rejects Supabase's self-signed cert. The ssl option below
        // explicitly disables certificate verification, which is correct for Supabase
        // direct connections in development.
        connectionString: ( process.env.DATABASE_URL || '' ).replace( /[?&]sslmode=[^&]*/g, '' ),
        ssl: { rejectUnauthorized: false },
    } );

    try {
        console.log( 'Connecting to database...' );
        await client.connect();
        console.log( 'Connected.\n' );

        // Run every *.sql file in /migrations/ in alphabetical order.
        // Adding a new migration = drop a new NNN_name.sql file in that folder.
        const migrationsDir = path.join( __dirname, '../migrations' );
        const files = fs.readdirSync( migrationsDir )
            .filter( f => f.endsWith( '.sql' ) )
            .sort(); // alphabetical → chronological (001_, 002_, ...)

        for ( const file of files ) {
            const sqlPath = path.join( migrationsDir, file );
            const sql = fs.readFileSync( sqlPath, 'utf8' );
            console.log( `Running migration: ${file} ...` );
            await client.query( sql );
            console.log( `✓ ${file} done.\n` );
        }

        console.log( '✓ All migrations completed successfully.' );
        console.log( 'All tables created (or already exist — safe to re-run).' );
    } catch ( err ) {
        console.error( '\n✗ Migration failed:', err.message );
        process.exit( 1 );
    } finally {
        await client.end();
    }
}

migrate();
