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
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    } );

    try {
        console.log( 'Connecting to database...' );
        await client.connect();
        console.log( 'Connected.\n' );

        const sqlPath = path.join( __dirname, '../migrations/001_initial_schema.sql' );
        const sql = fs.readFileSync( sqlPath, 'utf8' );

        console.log( 'Running migration: 001_initial_schema.sql ...' );
        await client.query( sql );

        console.log( '\n✓ Migration completed successfully.' );
        console.log( 'All tables created (or already exist — safe to re-run).' );
    } catch ( err ) {
        console.error( '\n✗ Migration failed:', err.message );
        process.exit( 1 );
    } finally {
        await client.end();
    }
}

migrate();
