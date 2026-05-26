/**
 * Re-exports both TripJack clients.
 * All TripJack calls must go through this module — no service or route imports axios directly.
 *
 * Usage:
 *   import { flights, hotels } from '../clients/tripjack/index.js';
 *   const results = await flights.searchFlights(...);
 */

export * as flights from './flightClient.js';
export * as hotels  from './hotelClient.js';
