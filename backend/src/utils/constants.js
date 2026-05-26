/**
 * Application-wide constants.
 * All magic numbers must live here — never hard-code in business logic.
 */

/** Child flight price = adult price × this ratio */
export const CHILD_FARE_RATIO = Number( process.env.CHILD_FARE_RATIO ) || 0.75;

/** Cron always searches return = departure + this many nights */
export const REFERENCE_NIGHTS = Number( process.env.REFERENCE_NIGHTS ) || 5;

/** Number of cheapest airlines cached per route-date */
export const TOP_N_FLIGHTS = Number( process.env.TOP_N_FLIGHTS ) || 3;

/** Maximum guests per room (2 adults + 1 child) */
export const MAX_OCCUPANCY_PER_ROOM = Number( process.env.MAX_OCCUPANCY_PER_ROOM ) || 3;

/** Refresh all dates in this window daily (tier 1) */
export const CACHE_DAYS_TIER1 = Number( process.env.CACHE_DAYS_TIER1 ) || 30;

/** Refresh dates beyond tier 1 up to this limit every 3 days (tier 2) */
export const CACHE_DAYS_TIER2 = Number( process.env.CACHE_DAYS_TIER2 ) || 90;

/** TripJack nationality code for India (must be a string, not integer) */
export const NATIONALITY_INDIA = '106';

/** How long a cache entry is considered fresh (hours) */
export const CACHE_STALE_HOURS = 48;

/** Origin city IATA codes */
export const ORIGIN_IATA_CODES = [ 'DEL', 'BOM', 'BLR', 'MAA', 'HYD', 'CCU', 'AMD', 'COK' ];

/** Destination city IATA codes */
export const DESTINATION_IATA_CODES = [ 'DXB', 'SIN', 'BKK', 'LHR', 'CDG', 'JFK', 'NRT', 'SYD', 'DPS', 'KUL' ];
