# Task: Implement Structured Logging with Pino — Replace console.log & Morgan

## Step 1 — Package changes

Run the following in order:

```bash
# Remove morgan
npm uninstall morgan

# Add pino production dependencies (if not already installed)
npm install pino pino-http

# pino-pretty is DEV ONLY — it must be in devDependencies
npm install --save-dev pino-pretty
```

If `pino-pretty` already exists as a regular dependency (in `dependencies` in package.json),
move it to `devDependencies`:
```bash
npm uninstall pino-pretty
npm install --save-dev pino-pretty
```

---

## Step 2 — Wire up the middleware in app.js / server.js

Find the main Express entry file (likely `src/app.js` or `src/server.js`).

**Remove:**
```js
import morgan from 'morgan';
app.use(morgan(...));
```

**Add:**
```js
import pinoHttp from 'pino-http';
import logger from './lib/logger.js'; // adjust relative path if needed

app.use(pinoHttp({ logger })); // replaces morgan — logs every HTTP request automatically
```

Place the `pinoHttp` middleware **early**, before route handlers.

---

## Step 3 — Replace all console statements across the codebase

Search every `.js` file under `src/` and apply the rules below.

### 3a — Import logger at the top of every file that uses console

```js
import logger from '../lib/logger.js'; // adjust relative path per file location
```

Only add this import to files that actually use `console.*`.

---

### 3b — Replacement rules

| Original | Replace with | Notes |
|---|---|---|
| `console.log('msg')` | `logger.info('msg')` | General info |
| `console.log('msg', someVar)` | `logger.info({ someVar }, 'msg')` | Context goes in first `{}` object |
| `console.error('msg', err)` | `logger.error({ err }, 'msg')` | Always pass err as object field, never as string |
| `console.error('msg')` | `logger.error('msg')` | Simple error message |
| `console.warn('msg')` | `logger.warn('msg')` | Warnings |
| `console.debug('msg')` | `logger.debug('msg')` | Suppressed in prod automatically |

**Key rule for context objects:** always put dynamic values as a structured object
in the **first argument**, and the human-readable message string as the **second**.

```js
// ✅ Correct — fields are searchable in log aggregators
logger.info({ bookingId, userId }, 'Booking initiated');
logger.error({ err, bookingId }, 'TripJack hotel booking failed');

// ❌ Wrong — context is buried in the message string
logger.info(`Booking initiated for ${bookingId}`);
```

---

### 3c — Log level guidelines — use the right level

| Scenario | Level |
|---|---|
| App startup, booking created, payment charged, booking confirmed | `info` |
| TripJack/Razorpay API calls (request sent, response received) | `debug` |
| Retries, fallbacks, unexpected but recoverable states | `warn` |
| Booking failure, payment failure, API timeout, unhandled exception | `error` |
| Internal flow tracing, full request/response payloads | `debug` |

---


## Step 4 — Verification checklist

After making all changes:

- [ ] `morgan` is removed from `package.json` (both dependencies and code)
- [ ] `pino-pretty` is in `devDependencies`, not `dependencies`
- [ ] `pino` and `pino-http` are in `dependencies`
- [ ] No `console.log`, `console.error`, `console.warn`, or `console.debug` remain
      anywhere under `src/` (run `grep -rn "console\." src/` to verify)
- [ ] `pinoHttp({ logger })` middleware is registered in the Express app

---

## Example — before and after

**Before:**
```js
console.log('Initiating TripJack hotel booking', bookingId);
try {
  const result = await tripjack.bookHotel(payload);
  console.log('Hotel booked', result);
} catch (err) {
  console.error('Hotel booking failed', err);
}
```

**After:**
```js
import logger from '../lib/logger.js';

logger.info({ bookingId }, 'Initiating TripJack hotel booking');
try {
  const result = await tripjack.bookHotel(payload);
  logger.info({ bookingId, hotelId: result.hotelId }, 'Hotel booked successfully');
} catch (err) {
  logger.error({ err, bookingId }, 'TripJack hotel booking failed');
}
```