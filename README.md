# CNK GO

B2C international holiday package booking — flight + hotel for Indian travellers.

---

## Backend Setup

### Prerequisites

- Node.js (LTS)
- A Supabase project (free tier works)
- TripJack sandbox API key (shared via team)

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in your `.env`:

| Variable | Where to find it |
|----------|-----------------|
| `DATABASE_URL` | Supabase Dashboard → Settings → Database → URI (Session mode, port 5432) |
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_KEY` | Supabase Dashboard → Settings → API → `service_role` key (secret!) |
| `TRIPJACK_API_KEY` | Shared in team chat |

Leave Razorpay empty until Week 3.

### 3. Set up Supabase (fresh start)

If this is a fresh project or you need to reset:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project → **SQL Editor**
3. If tables already exist and you want a clean slate, run:

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

4. Then run the migration:

```bash
npm run migrate
```

This creates all 10 tables + seeds origin cities and destinations.

### 4. Verify

```bash
npm run dev
```

You should see:
```
Connecting to database...
Database connected.
[server] Running on port 4000 (development)
```

Visit `http://localhost:4000` — should return `{"name":"cnk-go-api","status":"ok","version":"1.0.0"}`.

### Project Structure

```
backend/
  src/
    index.js               # Express app entry point
    config/
      supabaseClient.js    # Supabase singleton (service role)
    clients/
      tripjack/
        flightClient.js    # Flight API wrappers (search, review, book, details, cancel)
        hotelClient.js     # Hotel API wrappers (H1-H4, details, cancel)
        index.js           # Re-exports both clients
    middleware/
      asyncHandler.js      # Wraps async routes for error forwarding
      authMiddleware.js    # Verifies Supabase JWT
      errorHandler.js      # Global error handler (4-arg)
      rateLimiter.js       # express-rate-limit config
    routes/                # Express route handlers (added per ticket)
    services/              # Business logic (added per ticket)
    jobs/                  # Cron job implementations (added per ticket)
    utils/
      constants.js         # All config constants
      priceCalculator.js   # Price calculation helpers
      dateHelpers.js       # Date manipulation utilities
  migrations/
    001_initial_schema.sql # All tables + seed data
  scripts/
    migrate.js             # Runs migrations via pg
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot-reload (nodemon) |
| `npm start` | Production start |
| `npm run migrate` | Run SQL migrations against Supabase |
| `npm run lint` | ESLint check |

---

## Frontend Setup

### Prerequisites

- Node.js (LTS)

### 1. Install & run

```bash
# From the repo root (not backend/)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

