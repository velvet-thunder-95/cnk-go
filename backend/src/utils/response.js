/**
 * Send a standardized JSON response.
 *
 * @param {object}  res         Express response object
 * @param {boolean} [success]   Whether the request succeeded (default: true)
 * @param {number}  [statusCode] HTTP status code (default: 200)
 * @param {string}  [message]   Human-readable message (omitted if not provided)
 * @param {*}       [data]      Response payload (omitted if not provided)
 * @returns {object}
 *
 * @example
 * response(res, true, 200, 'Results found', results);
 * // → { "success": true, "message": "Results found", "data": [...] }
 *
 * @example
 * response(res, false, 400, 'origin is required');
 * // → { "success": false, "message": "origin is required" }
 *
 * @example
 * response(res);
 * // → { "success": true }
 */
export default function response( res, success = true, statusCode = 200, message, data ) {
    const result = { success };

    if ( message ) result.message = message;
    if ( data    ) result.data    = data;

    return res.status( statusCode ).json( result );
}
