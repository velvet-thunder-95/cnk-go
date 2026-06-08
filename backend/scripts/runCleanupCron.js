/**
 * Data Cleanup Cron — Standalone Runner
 *
 * Usage:
 *   node scripts/runCleanupCron.js          → schedules cron (default: 00:05 every day)
 *   node scripts/runCleanupCron.js --now    → runs immediately then exits
 *
 * The default schedule runs 5 minutes after midnight so today's "cleaned" date
 * is always correct before the flight / hotel crons start at 2:00 AM.
 *
 * Override the schedule via CRON_SCHEDULE_CLEANUP environment variable.
 */
import 'dotenv/config';
import cron from 'node-cron';
import { runCleanupCron } from '../src/jobs/cleanupCron.js';

const CRON_SCHEDULE = process.env.CRON_SCHEDULE_CLEANUP || '5 0 * * *';

if ( process.argv.includes( '--now' ) ) {
    console.log( '[cleanup-cron] Running immediately (--now flag)' );
    runCleanupCron()
        .then( () => {
            console.log( '[cleanup-cron] Done.' );
            process.exit( 0 );
        } )
        .catch( ( err ) => {
            console.error( '[cleanup-cron] Fatal error:', err );
            process.exit( 1 );
        } );
} else {
    console.log( `[cleanup-cron] Scheduled at: ${CRON_SCHEDULE}` );

    cron.schedule( CRON_SCHEDULE, () => {
        console.log( `[cleanup-cron] Triggered at ${new Date().toISOString()}` );
        runCleanupCron().catch( ( err ) => {
            console.error( '[cleanup-cron] Run failed:', err );
        } );
    } );
}
