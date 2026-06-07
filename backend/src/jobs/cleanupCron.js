import supabase from '../config/supabaseClient.js';

/**
 * How many days of cron_runs / cron_job_failures history to retain.
 * Rows older than this are deleted by the cleanup job.
 */
const CRON_LOG_RETENTION_DAYS = Number( process.env.CLEANUP_CRON_LOG_RETENTION_DAYS ) || 30;

/** Returns current time as HH:MM:SS for log prefixes. */
const ts = () => new Date().toISOString().slice( 11, 19 );

/**
 * Returns a YYYY-MM-DD string offset by the given number of days,
 * explicitly using UTC to keep things uniform and consistent.
 *
 * @param {number} daysOffset - Days to add/subtract (e.g., -6 for 6 days ago)
 * @returns {string}  e.g. '2026-06-07'
 */
function getUTCDateString( daysOffset = 0 ) {
    const d = new Date();
    d.setUTCDate( d.getUTCDate() + daysOffset );

    return d.toISOString().slice( 0, 10 );
}

/**
 * Deletes stale rows from a single table and returns the count removed.
 *
 * @param {string} table       Supabase table name
 * @param {string} dateColumn  The DATE column to filter on
 * @param {string} cutoff      YYYY-MM-DD — rows with dateColumn < cutoff are deleted
 * @returns {Promise<number>}  Number of rows deleted
 */
async function purgeTable( table, dateColumn, cutoff ) {
    const { error, count } = await supabase
        .from( table )
        .delete( { count: 'exact' } )
        .lt( dateColumn, cutoff );

    if ( error ) {
        throw new Error( `Failed to purge ${table}.${dateColumn} < ${cutoff}: ${error.message}` );
    }

    return count ?? 0;
}

/**
 * Runs the full data-cleanup cron job.
 *
 * What it removes:
 *   • flight_price_cache  — rows where departure_date  < today
 *   • hotel_price_cache   — rows where check_in_date   < today
 *   • weekly_price_cache  — rows where week_start_date < (today − 6 days) i.e. the full week has ended
 *   • cron_job_failures   — rows older than CRON_LOG_RETENTION_DAYS days
 *   • cron_runs           — rows older than CRON_LOG_RETENTION_DAYS days
 *
 * A cron_runs record of run_type='cleanup' is written for every execution,
 * following the same audit pattern used by the flight and hotel crons.
 */
export async function runCleanupCron() {
    const startedAt = new Date().toISOString();
    const today     = getUTCDateString( 0 );

    // Cutoff for operational log retention (YYYY-MM-DD)
    const retentionCutoff = getUTCDateString( -CRON_LOG_RETENTION_DAYS );

    // weekly_price_cache rows represent full Monday-anchored weeks.
    // A week is fully stale only once week_start_date + 7 <= today,
    // i.e. week_start_date < today - 6. Using today directly would
    // delete the current ongoing week.
    const weeklyCutoff = getUTCDateString( -6 );

    console.log( `[cleanup-cron][${ts()}] STARTING — purging cache dates < ${today}, weekly weeks ending before ${weeklyCutoff}, cron logs older than ${retentionCutoff}` );

    // ── Create audit record ─────────────────────────────────────────────────
    const { data: cronRun, error: cronErr } = await supabase
        .from( 'cron_runs' )
        .insert( { run_type: 'cleanup', started_at: startedAt } )
        .select( 'id' )
        .single();

    if ( cronErr ) {
        console.error( '[cleanup-cron] Failed to create cron_runs entry:', cronErr.message );

        return;
    }

    const cronRunId = cronRun.id;
    console.log( `[cleanup-cron][${ts()}] Started run #${cronRunId}` );

    let totalDeleted = 0;
    let failCount    = 0;

    // ── 1. Purge flight_price_cache ─────────────────────────────────────────
    try {
        const n = await purgeTable( 'flight_price_cache', 'departure_date', today );
        console.log( `[cleanup-cron][${ts()}] flight_price_cache  — ${n} rows removed (departure_date < ${today})` );
        totalDeleted += n;
    } catch ( err ) {
        failCount++;
        console.error( `[cleanup-cron][${ts()}] ERROR purging flight_price_cache:`, err.message );
    }

    // ── 2. Purge hotel_price_cache ──────────────────────────────────────────
    try {
        const n = await purgeTable( 'hotel_price_cache', 'check_in_date', today );
        console.log( `[cleanup-cron][${ts()}] hotel_price_cache   — ${n} rows removed (check_in_date < ${today})` );
        totalDeleted += n;
    } catch ( err ) {
        failCount++;
        console.error( `[cleanup-cron][${ts()}] ERROR purging hotel_price_cache:`, err.message );
    }

    // ── 3. Purge weekly_price_cache ─────────────────────────────────────────
    // Purge on week_start_date (the semantic week anchor / UNIQUE key),
    // not cheapest_date, so we only remove fully-completed weeks.
    // Cutoff = today - 6 days: a week starting on that Monday ended yesterday.
    try {
        const n = await purgeTable( 'weekly_price_cache', 'week_start_date', weeklyCutoff );
        console.log( `[cleanup-cron][${ts()}] weekly_price_cache  — ${n} rows removed (week_start_date < ${weeklyCutoff})` );
        totalDeleted += n;
    } catch ( err ) {
        failCount++;
        console.error( `[cleanup-cron][${ts()}] ERROR purging weekly_price_cache:`, err.message );
    }

    // ── 4. Purge old cron_job_failures (FK child — must go before cron_runs) ──
    try {
        const n = await purgeTable( 'cron_job_failures', 'created_at', retentionCutoff );
        console.log( `[cleanup-cron][${ts()}] cron_job_failures  — ${n} rows removed (older than ${CRON_LOG_RETENTION_DAYS} days)` );
        totalDeleted += n;
    } catch ( err ) {
        failCount++;
        console.error( `[cleanup-cron][${ts()}] ERROR purging cron_job_failures:`, err.message );
    }

    // ── 5. Purge old cron_runs (FK parent — safe now that children are gone) ──
    try {
        const n = await purgeTable( 'cron_runs', 'created_at', retentionCutoff );
        console.log( `[cleanup-cron][${ts()}] cron_runs          — ${n} rows removed (older than ${CRON_LOG_RETENTION_DAYS} days)` );
        totalDeleted += n;
    } catch ( err ) {
        failCount++;
        console.error( `[cleanup-cron][${ts()}] ERROR purging cron_runs:`, err.message );
    }

    // ── Mark run complete ───────────────────────────────────────────────────
    await supabase
        .from( 'cron_runs' )
        .update( {
            completed_at  : new Date().toISOString(),
            total_jobs    : 5,               // 5 purge operations above
            success_count : 5 - failCount,
            fail_count    : failCount,
        } )
        .eq( 'id', cronRunId );

    console.log(
        `[cleanup-cron][${ts()}] Completed run #${cronRunId}: ` +
        `${totalDeleted} total rows removed, ${failCount} operation(s) failed`,
    );
}
