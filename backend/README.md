# CNK GO — Backend

Node.js + Express API server. Runs on port 4000.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in the values below.

---

### 3. Get your Supabase credentials

You need three values from Supabase. All are in the Dashboard.

#### `SUPABASE_URL` and `SUPABASE_KEY` (service role)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → open the project
2. Left sidebar → **Settings** → **API**
3. Under **Project URL** → copy and paste as `SUPABASE_URL`
4. Under **Project API keys** → reveal the **`service_role`** key → paste as `SUPABASE_KEY`

> ⚠️ The `service_role` key bypasses all row-level security. Never put it in frontend code or commit it to git.

#### `DATABASE_URL` (for running migrations)

1. Supabase Dashboard → **Settings** → **Database**
2. Scroll to **Connection string** → select the **URI** tab
3. Make sure the mode is **Session** (port 5432, not 6543)
4. Copy and paste as `DATABASE_URL`

---

### 4. Run the migration

This creates all 10 database tables and seeds origin cities + destinations.

```bash
npm run migrate
```

Safe to re-run — all statements use `IF NOT EXISTS`.

If you need a clean slate first, run this in Supabase SQL Editor:

```sql
DROP TABLE IF EXISTS cron_job_failures CASCADE;
DROP TABLE IF EXISTS cron_runs CASCADE;
DROP TABLE IF EXISTS booking_passengers CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS weekly_price_cache CASCADE;
DROP TABLE IF EXISTS hotel_price_cache CASCADE;
DROP TABLE IF EXISTS flight_price_cache CASCADE;
DROP TABLE IF EXISTS hotels CASCADE;
DROP TABLE IF EXISTS destinations CASCADE;
DROP TABLE IF EXISTS origin_cities CASCADE;
DROP TABLE IF EXISTS health CASCADE;
```

Then run `npm run migrate` again.

---

### 5. Start the server

```bash
npm run dev      # hot-reload via nodemon
npm start        # production
```

Visit `http://localhost:4000` — should return:

```json
{ "name": "cnk-go-api", "status": "ok", "version": "1.0.0" }
```

---

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start with hot-reload (nodemon) |
| `npm start` | Start without hot-reload |
| `npm run migrate` | Run SQL migrations against Supabase |
| `npm run lint` | Check for lint errors |
| `npm run lint:fix` | Auto-fix lint errors |

---

## Project structure

```
src/
  index.js                      # App entry point — middleware, routes, error handler
  config/
    supabaseClient.js           # Supabase JS client singleton (service role)
  clients/
    tripjack/
      flightClient.js           # TripJack flight API wrappers (search, review, book, details, cancel)
      hotelClient.js            # TripJack hotel API wrappers (H1 listing → H4 book)
      index.js                  # Re-exports both clients
  middleware/
    asyncHandler.js             # Wraps async route handlers — forwards errors to globalErrorHandler
    authMiddleware.js           # Verifies Supabase JWT on protected routes
    errorHandler.js             # Global Express error handler (4-arg)
    rateLimiter.js              # Rate limits: search 10/min, booking 5/day
  routes/                       # Route handlers (added per ticket — currently empty)
  services/                     # Business logic (added per ticket — currently empty)
  jobs/                         # Cron job implementations (added per ticket — currently empty)
  utils/
    constants.js                # All business config constants (read from env)
    priceCalculator.js          # Price calculation helpers
    dateHelpers.js              # Date manipulation utilities

migrations/
  001_initial_schema.sql        # All tables + seed data — run via npm run migrate

scripts/
  migrate.js                    # Reads 001_initial_schema.sql and runs it via pg
```

---

## TripJack API keys (sandbox)

Both flights and hotels use the **same API key**. Get it from the team lead.

```
TRIPJACK_API_KEY=your-key-here
```

Two different base URLs:

| What | URL |
|------|-----|
| Flights (search, review, book) | `https://apitest.tripjack.com` |
| Hotels search + pricing + review | `https://apitest-hms.tripjack.com` |
| Hotels book + cancel + details | `https://apitest.tripjack.com` (OMS) |
