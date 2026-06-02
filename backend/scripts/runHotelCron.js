import 'dotenv/config';
import cron from 'node-cron';
import { runHotelCron } from '../src/jobs/hotelCron.js';

const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 2 * * *';

if (process.argv.includes('--now')) {
    console.log('[hotel-cron] Running immediately (--now flag)');
    runHotelCron()
        .then(() => {
            console.log('[hotel-cron] Done.');
            process.exit(0);
        })
        .catch((err) => {
            console.error('[hotel-cron] Fatal error:', err);
            process.exit(1);
        });
} else {
    console.log(`[hotel-cron] Scheduled at: ${CRON_SCHEDULE}`);
    cron.schedule(CRON_SCHEDULE, () => {
        console.log(`[hotel-cron] Triggered at ${new Date().toISOString()}`);
        runHotelCron().catch((err) => {
            console.error('[hotel-cron] Run failed:', err);
        });
    });
}
