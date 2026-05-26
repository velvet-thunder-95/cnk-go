import { REFERENCE_NIGHTS } from './constants.js';

/**
 * Add a number of days to a YYYY-MM-DD date string.
 * @param {string} dateStr  YYYY-MM-DD
 * @param {number} days
 * @returns {string}  YYYY-MM-DD
 */
export function addDays( dateStr, days ) {
    const d = new Date( dateStr );
    d.setUTCDate( d.getUTCDate() + days );
    
    return d.toISOString().slice( 0, 10 );
}

/**
 * Get the return date for a cron flight search (departure + REFERENCE_NIGHTS).
 * @param {string} departureDate  YYYY-MM-DD
 * @returns {string}  YYYY-MM-DD
 */
export function getReturnDate( departureDate ) {
    return addDays( departureDate, REFERENCE_NIGHTS );
}

/**
 * Get the Monday (week start) for a given date.
 * @param {string|Date} date
 * @returns {string}  YYYY-MM-DD
 */
export function getWeekStart( date ) {
    const d = new Date( date );
    const day = d.getUTCDay();
    const diff = ( day === 0 ? -6 : 1 - day ); // Monday = 1
    d.setUTCDate( d.getUTCDate() + diff );
    
    return d.toISOString().slice( 0, 10 );
}

/**
 * Returns true if a cache row is stale (fetched_at older than staleHours).
 * @param {string|Date} fetchedAt
 * @param {number}      [staleHours=48]
 * @returns {boolean}
 */
export function isStale( fetchedAt, staleHours = 48 ) {
    const ageMs = Date.now() - new Date( fetchedAt ).getTime();
    
    return ageMs > staleHours * 60 * 60 * 1000;
}

/**
 * Generate a list of departure dates for cron tier-based refresh.
 * Tier 1 (days 1–CACHE_DAYS_TIER1): refresh daily.
 * Tier 2 (days TIER1+1–CACHE_DAYS_TIER2): refresh every 3 days.
 *
 * @param {number} tier1Days  e.g. 30
 * @param {number} tier2Days  e.g. 90
 * @returns {string[]}  Array of YYYY-MM-DD strings
 */
export function getCronDates( tier1Days, tier2Days ) {
    const dates = [];
    const today = new Date();

    for ( let i = 1; i <= tier1Days; i++ ) {
        const d = new Date( today );
        d.setUTCDate( d.getUTCDate() + i );
        dates.push( d.toISOString().slice( 0, 10 ) );
    }

    for ( let i = tier1Days + 1; i <= tier2Days; i += 3 ) {
        const d = new Date( today );
        d.setUTCDate( d.getUTCDate() + i );
        dates.push( d.toISOString().slice( 0, 10 ) );
    }

    return dates;
}

/**
 * Extract HH:MM from an ISO datetime string (TripJack dt/at fields).
 * @param {string} isoString  e.g. '2026-07-15T06:30:00'
 * @returns {string}  e.g. '06:30'
 */
export function extractTime( isoString ) {
    return isoString?.slice( 11, 16 ) ?? '';
}
