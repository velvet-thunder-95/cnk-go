import { createClient } from '@supabase/supabase-js';

if ( !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY ) {
    console.error( 'ERROR: SUPABASE_URL and SUPABASE_KEY must be set in .env file.' );
    console.error( 'Copy .env.example to .env and fill in your Supabase credentials.' );
    process.exit( 1 );
}

/**
 * Singleton Supabase client using the service role key.
 * Bypasses Row Level Security — never expose this key client-side.
 */
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default supabase;
