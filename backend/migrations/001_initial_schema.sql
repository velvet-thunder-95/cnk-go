CREATE TABLE IF NOT EXISTS health (
  id SERIAL PRIMARY KEY
);

-- ─── B1. origin_cities ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS origin_cities (
  id            SERIAL PRIMARY KEY,
  city_name     VARCHAR(100) NOT NULL,
  iata_code     CHAR(3)      UNIQUE NOT NULL,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ─── B2. destinations ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS destinations (
  id                     SERIAL PRIMARY KEY,
  city_name              VARCHAR(100) NOT NULL,
  country                VARCHAR(100) NOT NULL,
  country_code           CHAR(2)      NOT NULL,   -- ISO 3166-1 alpha-2, lowercase (Booking.com expects "ae", "th")
  iata_code              CHAR(3)      UNIQUE NOT NULL,
  booking_com_city_id    INTEGER,                  -- from Booking.com /common/locations/cities
  description            TEXT,
  thumbnail_url          VARCHAR(500),
  is_active              BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ─── B3. hotels ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hotels (
  id                      SERIAL PRIMARY KEY,
  destination_id          INTEGER      NOT NULL REFERENCES destinations(id),
  booking_com_hotel_id    INTEGER      NOT NULL,   -- numeric accommodation ID from Booking.com
  name                    VARCHAR(200) NOT NULL,
  star_rating             INTEGER      NOT NULL CHECK (star_rating BETWEEN 1 AND 5),
  address                 VARCHAR(300),
  description             TEXT,
  amenities               TEXT[],
  images                  TEXT[],
  check_in_time           VARCHAR(10),             -- e.g. "14:00"
  check_out_time          VARCHAR(10),             -- e.g. "12:00"
  review_score            DECIMAL(3,1),            -- Booking.com score, e.g. 8.5
  is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hotels_booking_id
  ON hotels(booking_com_hotel_id);

CREATE INDEX IF NOT EXISTS idx_hotels_destination
  ON hotels(destination_id, star_rating)
  WHERE is_active = TRUE;

-- ─── B4. flight_price_cache ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flight_price_cache (
  id                      SERIAL PRIMARY KEY,
  origin_iata             CHAR(3)      NOT NULL,
  destination_iata        CHAR(3)      NOT NULL,
  departure_date          DATE         NOT NULL,
  return_date             DATE         NOT NULL,   -- departure_date + REFERENCE_NIGHTS
  min_price               DECIMAL(12,2),           -- cheapest round-trip, 1 adult
  cheapest_airline_name   VARCHAR(100),
  cheapest_airline_code   CHAR(3),
  min_duration_minutes    INTEGER,
  stops                   INTEGER      DEFAULT 0,
  result_count            INTEGER,
  currency                CHAR(3)      NOT NULL DEFAULT 'INR',
  fetched_at              TIMESTAMP    NOT NULL,

  CONSTRAINT uq_flight_cache UNIQUE (origin_iata, destination_iata, departure_date)
);

CREATE INDEX IF NOT EXISTS idx_flight_cache_lookup
  ON flight_price_cache(origin_iata, destination_iata, departure_date)
  WHERE min_price IS NOT NULL;

-- ─── B5. hotel_price_cache ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hotel_price_cache (
  id                SERIAL PRIMARY KEY,
  hotel_id          INTEGER      NOT NULL REFERENCES hotels(id),
  check_in_date     DATE         NOT NULL,
  price_per_night   DECIMAL(12,2) NOT NULL,        -- total / nights for 1 room, 2 adults
  currency          CHAR(3)      NOT NULL DEFAULT 'INR',
  fetched_at        TIMESTAMP    NOT NULL,

  CONSTRAINT uq_hotel_cache UNIQUE (hotel_id, check_in_date)
);

CREATE INDEX IF NOT EXISTS idx_hotel_cache_lookup
  ON hotel_price_cache(check_in_date, hotel_id);

-- ─── B6. weekly_price_cache ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_price_cache (
  id                          SERIAL PRIMARY KEY,
  origin_iata                 CHAR(3)      NOT NULL,
  destination_iata            CHAR(3)      NOT NULL,
  week_start_date             DATE         NOT NULL,
  min_flight_price            DECIMAL(12,2),
  cheapest_hotel_per_night    DECIMAL(12,2),
  cheapest_hotel_id           INTEGER      REFERENCES hotels(id),
  cheapest_airline_name       VARCHAR(100),
  cheapest_airline_code       CHAR(3),
  currency                    CHAR(3)      NOT NULL DEFAULT 'INR',
  computed_at                 TIMESTAMP    NOT NULL,

  CONSTRAINT uq_weekly_cache UNIQUE (origin_iata, destination_iata, week_start_date)
);

-- ─── B7. bookings ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id                          SERIAL PRIMARY KEY,

  -- Search context
  origin_iata                 CHAR(3)      NOT NULL,
  destination_iata            CHAR(3)      NOT NULL,
  departure_date              DATE         NOT NULL,
  return_date                 DATE         NOT NULL,
  nights                      INTEGER      NOT NULL,
  adults                      INTEGER      NOT NULL,
  children                    INTEGER      NOT NULL DEFAULT 0,
  child_ages                  INTEGER[],
  rooms                       INTEGER      NOT NULL DEFAULT 1,
  hotel_id                    INTEGER      REFERENCES hotels(id),

  -- Estimated prices from cache
  estimated_flight_cost       DECIMAL(12,2),
  estimated_hotel_cost        DECIMAL(12,2),
  estimated_total             DECIMAL(12,2),

  -- Hotel booking — Booking.com (booked FIRST)
  hotel_order_id              VARCHAR(50),          -- from /orders/create
  hotel_reservation_id        VARCHAR(50),
  hotel_pincode               VARCHAR(10),
  hotel_status                VARCHAR(30),          -- booked | cancelled | no-show
  hotel_amount                DECIMAL(12,2),
  hotel_cancellation_type     VARCHAR(30),          -- free_cancellation | non_refundable
  hotel_free_cancel_until     TIMESTAMP,
  hotel_booked_at             TIMESTAMP,

  -- Flight booking — Tripjack (booked SECOND)
  flight_booking_id           VARCHAR(50),          -- Tripjack booking ID
  flight_pnr                  VARCHAR(20),
  flight_status               VARCHAR(30),          -- CONFIRMED | FAILED | PENDING
  flight_amount               DECIMAL(12,2),
  flight_booked_at            TIMESTAMP,

  -- Overall
  total_amount                DECIMAL(12,2),
  currency                    CHAR(3)      DEFAULT 'INR',
  status                      VARCHAR(30)  NOT NULL DEFAULT 'initiated',
  -- status flow: initiated → hotel_failed | hotel_booked → confirmed | flight_failed | flight_pending
  --              flight_failed → cancelled | cancel_failed

  created_at                  TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON bookings(status, created_at DESC);

-- ─── B8. booking_passengers ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_passengers (
  id                  SERIAL PRIMARY KEY,
  booking_id          INTEGER      NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  title               VARCHAR(10)  NOT NULL,        -- Mr | Mrs | Ms | Mstr | Miss
  first_name          VARCHAR(100) NOT NULL,
  last_name           VARCHAR(100) NOT NULL,
  pax_type            VARCHAR(10)  NOT NULL,        -- adult | child
  gender              VARCHAR(10)  NOT NULL,
  date_of_birth       DATE         NOT NULL,
  age                 INTEGER,
  is_lead             BOOLEAN      NOT NULL DEFAULT FALSE,
  email               VARCHAR(200),
  phone               VARCHAR(20),
  phone_country_code  VARCHAR(5),
  passport_number     VARCHAR(50),
  passport_expiry     DATE,
  nationality         CHAR(2)      NOT NULL DEFAULT 'IN',
  address_line_1      VARCHAR(200),
  city                VARCHAR(100),
  country_code        CHAR(2),
  country_name        VARCHAR(100),
  created_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_passengers_booking
  ON booking_passengers(booking_id);

-- ─── B10. cron_runs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cron_runs (
  id              SERIAL PRIMARY KEY,
  run_type        VARCHAR(20)  NOT NULL,            -- flights | hotels | weekly_agg
  started_at      TIMESTAMP    NOT NULL,
  completed_at    TIMESTAMP,
  total_jobs      INTEGER,
  success_count   INTEGER      DEFAULT 0,
  fail_count      INTEGER      DEFAULT 0,
  created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── B11. cron_job_failures ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cron_job_failures (
  id              SERIAL PRIMARY KEY,
  cron_run_id     INTEGER      REFERENCES cron_runs(id),
  job_type        VARCHAR(20)  NOT NULL,
  job_params      JSONB        NOT NULL,
  error_code      VARCHAR(20),
  error_message   TEXT,
  retry_count     INTEGER      DEFAULT 0,
  created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Backend connects via DATABASE_URL (service role) which bypasses RLS.
-- RLS blocks accidental exposure through Supabase's auto-generated REST API.
ALTER TABLE origin_cities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels               ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_price_cache   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_price_cache    ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_price_cache   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_passengers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_runs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_job_failures    ENABLE ROW LEVEL SECURITY;
