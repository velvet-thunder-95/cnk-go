/**
 * @file helpers.js
 * General-purpose utility helpers shared across controllers and services.
 * Pure functions with no side-effects — safe to import anywhere.
 */

/**
 * Parses a value as a non-negative integer.
 * Returns NaN for any value that cannot be parsed or is negative.
 *
 * @param {*} value - The value to parse (string, number, etc.)
 * @returns {number} The parsed non-negative integer, or NaN if invalid.
 *
 * @example
 * parseNonNegativeInt('3')   // → 3
 * parseNonNegativeInt('-1')  // → NaN
 * parseNonNegativeInt('abc') // → NaN
 */
export function parseNonNegativeInt( value ) {
    const parsed = parseInt( value, 10 );

    return Number.isNaN( parsed ) || parsed < 0 ? NaN : parsed;
}

/**
 * Returns a Promise that resolves after `ms` milliseconds.
 * Used to introduce deliberate delays in polling loops without blocking the event loop.
 *
 * @param {number} ms - Milliseconds to wait.
 * @returns {Promise<void>}
 *
 * @example
 * await wait(2000); // pauses for 2 seconds
 */
export function wait( ms ) {
    return new Promise( resolve => setTimeout( resolve, ms ) );
}

/**
 * Validates that a string is a real calendar date in YYYY-MM-DD format.
 *
 * The regex catches non-numeric input, and the reconstruction check catches
 * impossible dates like `2026-02-30` (which `Date.parse` silently overflows
 * to March).
 *
 * @param {string} dateStr - The date string to validate.
 * @returns {boolean} `true` if valid YYYY-MM-DD calendar date.
 *
 * @example
 * isValidDate('2026-06-15') // → true
 * isValidDate('2026-02-30') // → false (Feb has no 30th)
 * isValidDate('tomorrow')   // → false
 */
export function isValidDate( dateStr ) {
    if ( typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test( dateStr ) ) return false;

    const [ y, m, d ] = dateStr.split( '-' ).map( Number );
    const dateObj = new Date( y, m - 1, d );

    return dateObj.getFullYear() === y && dateObj.getMonth() === m - 1 && dateObj.getDate() === d;
}

/**
 * Validates an Indian PAN (Permanent Account Number) format.
 * Standard format: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g. BPHPY1955F).
 *
 * @param {string} pan - The PAN string to validate.
 * @returns {boolean} `true` if valid PAN format.
 *
 * @example
 * isValidPanNumber('BPHPY1955F') // → true
 * isValidPanNumber('bphpy1955f') // → false (must be uppercase)
 * isValidPanNumber('12345')      // → false
 */
export function isValidPanNumber( pan ) {
    return typeof pan === 'string' && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test( pan );
}
