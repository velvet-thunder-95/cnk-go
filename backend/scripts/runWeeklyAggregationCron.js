import 'dotenv/config';
import cron from 'node-cron';
import { runWeeklyAggregation } from '../src/jobs/weeklyPriceCron.js';

const CRON_SCHEDULE = process.env.CRON_SCHEDULE_WEEKLY || '30 2 * * *';

if ( process.argv.includes( '--now' ) ) {
    console.log( '[weekly-agg] Running immediately (--now flag)' );
    runWeeklyAggregation()
        .then( () => {
            console.log( '[weekly-agg] Done.' );
            process.exit( 0 );
        } )
        .catch( ( err ) => {
            console.error( '[weekly-agg] Fatal error:', err );
            process.exit( 1 );
        } );
} else {
    console.log( `[weekly-agg] Scheduled at: ${CRON_SCHEDULE}` );
    cron.schedule( CRON_SCHEDULE, () => {
        console.log( `[weekly-agg] Triggered at ${new Date().toISOString()}` );
        runWeeklyAggregation().catch( ( err ) => {
            console.error( '[weekly-agg] Run failed:', err );
        } );
    } );
}