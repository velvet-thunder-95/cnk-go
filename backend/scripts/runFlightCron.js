/**
 * Flight Price Cron — Standalone Runner
 *
 * Usage:
 *   node scripts/runFlightCron.js          → schedules cron at CRON_SCHEDULE (default: 2am daily)
 *   node scripts/runFlightCron.js --now    → runs immediately then exits
 */
import 'dotenv/config';
import cron from 'node-cron';
import { runFlightCron } from '../src/jobs/flightCron.js';

const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 2 * * *';

if ( process.argv.includes( '--now' ) ) {
    console.log( '[flight-cron] Running immediately (--now flag)' );
    runFlightCron()
        .then( () => {
            console.log( '[flight-cron] Done.' );
            process.exit( 0 );
        } )
        .catch( ( err ) => {
            console.error( '[flight-cron] Fatal error:', err );
            process.exit( 1 );
        } );
} else {
    console.log( `[flight-cron] Scheduled at: ${CRON_SCHEDULE}` );
    console.log( '[flight-cron] Waiting for next trigger... (Ctrl+C to stop)' );

    cron.schedule( CRON_SCHEDULE, () => {
        console.log( `[flight-cron] Triggered at ${new Date().toISOString()}` );
        runFlightCron().catch( ( err ) => {
            console.error( '[flight-cron] Run failed:', err );
        } );
    } );
}
