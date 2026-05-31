-- ─────────────────────────────────────────────────────────────────────────────
-- 002_flight_cache_fk.sql
-- Add FK constraints from flight_price_cache to origin_cities / destinations.
-- Safe to re-run — uses DO $$ blocks with existence checks.
-- Prerequisite: origin_cities and destinations must be seeded before running
--               the flight cron (both tables are populated by 001).
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_flight_cache_origin'
      AND table_name = 'flight_price_cache'
  ) THEN
    ALTER TABLE flight_price_cache
      ADD CONSTRAINT fk_flight_cache_origin
        FOREIGN KEY (origin_iata) REFERENCES origin_cities(iata_code)
        ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_flight_cache_destination'
      AND table_name = 'flight_price_cache'
  ) THEN
    ALTER TABLE flight_price_cache
      ADD CONSTRAINT fk_flight_cache_destination
        FOREIGN KEY (destination_iata) REFERENCES destinations(iata_code)
        ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;
