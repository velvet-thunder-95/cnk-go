-- Add preferred_airline_code to bookings.
-- Stores the IATA airline code the user selected on the detail page
-- (e.g. 'AI', '6E', 'EK'). Used at review time so the orchestrator
-- can prefer that airline when re-running the live flight search,
-- without requiring the frontend to re-send it.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS preferred_airline_code CHAR(3);
