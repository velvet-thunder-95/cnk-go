-- Store the exact room configuration selected by the frontend.
-- TripJack hotel booking requires one roomTravellerInfo entry per searched room,
-- so the confirm step must not reconstruct room counts heuristically.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS room_config JSONB;

UPDATE bookings
SET room_config = jsonb_build_array(
  jsonb_build_object(
    'adults', adults,
    'children', children,
    'childAge', to_jsonb(COALESCE(child_ages, ARRAY[]::INTEGER[]))
  )
)
WHERE room_config IS NULL;