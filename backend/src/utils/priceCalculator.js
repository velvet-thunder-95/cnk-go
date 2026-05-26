import { MAX_OCCUPANCY_PER_ROOM, CHILD_FARE_RATIO as DEFAULT_CHILD_FARE_RATIO } from './constants.js';

/**
 * Minimum rooms needed for a group.
 * @param {number} adults
 * @param {number} children
 * @returns {number}
 */
export function minRooms( adults, children ) {
    return Math.ceil( ( adults + children ) / MAX_OCCUPANCY_PER_ROOM );
}

/**
 * Format flight duration minutes to human-readable string.
 * @param {number} minutes
 * @returns {string}  e.g. '3h 30m'
 */
export function formatDuration( minutes ) {
    const h = Math.floor( minutes / 60 );
    const m = minutes % 60;
    
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Format stops count for UI display.
 * @param {number} stops
 * @returns {string}
 */
export function formatStops( stops ) {
    if ( stops === 0 ) return 'Non-stop';
    if ( stops === 1 ) return '1 stop';
    
    return `${stops} stops`;
}

/**
 * Calculate per-person package price.
 * child_flight = adult_flight × childFareRatio (computed at query time, never stored).
 *
 * @param {number} flightPricePerAdult  Round-trip price for 1 adult (INR)
 * @param {number} hotelPricePerNight   Price per night for the selected room (INR)
 * @param {number} nights
 * @param {number} rooms
 * @param {number} adults
 * @param {number} children
 * @param {number} [childFareRatio]
 * @returns {number}  Per-person total (INR), rounded to 2 decimal places
 */
export function calculatePerPerson(
    flightPricePerAdult,
    hotelPricePerNight,
    nights,
    rooms,
    adults,
    children,
    childFareRatio = DEFAULT_CHILD_FARE_RATIO,
) {
    const flightTotal = ( flightPricePerAdult * adults ) + ( flightPricePerAdult * childFareRatio * children );
    const hotelTotal  = hotelPricePerNight * nights * rooms;
    const perPerson   = ( flightTotal + hotelTotal ) / ( adults + children );
    
    return Math.round( perPerson * 100 ) / 100;
}

/**
 * Get calendar price tier for colour coding.
 * ≤ p33 → 'green', p33–p66 → 'amber', > p66 → 'red'
 *
 * @param {number} price
 * @param {number} p33   33rd percentile of the week set
 * @param {number} p66   66th percentile of the week set
 * @returns {'green'|'amber'|'red'}
 */
export function getPriceTier( price, p33, p66 ) {
    if ( price <= p33 ) return 'green';
    if ( price <= p66 ) return 'amber';
    
    return 'red';
}

/**
 * Generate a consistent correlationId for a hotel booking session.
 * Must be the same across H1 → H2 → H3 for the same booking.
 * @param {number|string} bookingId
 * @returns {string}
 */
export function generateCorrelationId( bookingId ) {
    return `cnkgo-${bookingId}-${Date.now()}`;
}
