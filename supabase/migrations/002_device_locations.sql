-- Latest GPS location for external device (Arduino bridge uploads here)
CREATE TABLE IF NOT EXISTS device_locations (
  device_id TEXT PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL CHECK (lat >= -90 AND lat <= 90),
  lng DOUBLE PRECISION NOT NULL CHECK (lng >= -180 AND lng <= 180),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE device_locations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'device_locations'
      AND policyname = 'authenticated_can_read_device_locations'
  ) THEN
    CREATE POLICY "authenticated_can_read_device_locations"
      ON device_locations
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'device_locations'
      AND policyname = 'service_role_can_insert_device_locations'
  ) THEN
    CREATE POLICY "service_role_can_insert_device_locations"
      ON device_locations
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'device_locations'
      AND policyname = 'service_role_can_update_device_locations'
  ) THEN
    CREATE POLICY "service_role_can_update_device_locations"
      ON device_locations
      FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;
