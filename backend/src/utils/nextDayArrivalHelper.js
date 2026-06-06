/**
 * Checks if a flight lands on the next day based on departure time and flight duration.
 * 
 * @param {string} departureTime - Departure time in "HH:MM" format (e.g., "23:35")
 * @param {number} durationMinutes - Flight duration in minutes (e.g., 260)
 * @returns {boolean} True if the arrival crosses midnight into the next day
 */
export function isNextDayArrival( departureTime, durationMinutes ) {
    if ( !departureTime || typeof departureTime !== 'string' ) return false;

    // 1. Split departure time into hours and minutes
    const [hoursStr, minutesStr] = departureTime.split( ':' );
    const hours = parseInt( hoursStr, 10 );
    const minutes = parseInt( minutesStr, 10 );

    if ( isNaN( hours ) || isNaN( minutes ) ) return false;

    // 2. Convert departure time to minutes since midnight
    const departureMinutes = ( hours * 60  ) + minutes;

    // 3. Add flight duration to calculate arrival minutes since midnight
    const arrivalMinutes = departureMinutes + ( durationMinutes || 0 );

    // 4. If arrival is at or past 1440 minutes (24 hours * 60 minutes), it's next day
    return arrivalMinutes >= 1440;
}
