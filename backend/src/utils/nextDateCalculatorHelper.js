/**
 * Returns the next day's date string in YYYY-MM-DD format.
 * @param {string} date - Date string in YYYY-MM-DD format (e.g. '2026-07-15')
 * @returns {string} Next day's date in YYYY-MM-DD format (e.g. '2026-07-16')
 */
export function nextDate( date ) {
    const d = new Date( `${date}T12:00:00` );
    d.setDate( d.getDate() + 1 );
    
    return d.toISOString().split( 'T' )[0];
}