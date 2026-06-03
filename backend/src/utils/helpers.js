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
