-- ─────────────────────────────────────────────────────────────────────────────
-- 006_flight_cache_time_to_timestamp.sql
-- Alter departure_time and arrival_time from VARCHAR(5) to TIMESTAMP.
-- Existing "HH:MM" data is nulled out — new inserts store full TIMESTAMP.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flight_price_cache'
      AND column_name = 'departure_time'
      AND data_type = 'character varying'
  ) THEN
    UPDATE flight_price_cache SET departure_time = NULL;

    ALTER TABLE flight_price_cache
      ALTER COLUMN departure_time TYPE TIMESTAMP
      USING NULL::TIMESTAMP;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flight_price_cache'
      AND column_name = 'arrival_time'
      AND data_type = 'character varying'
  ) THEN
    UPDATE flight_price_cache SET arrival_time = NULL;

    ALTER TABLE flight_price_cache
      ALTER COLUMN arrival_time TYPE TIMESTAMP
      USING NULL::TIMESTAMP;
  END IF;

END $$;