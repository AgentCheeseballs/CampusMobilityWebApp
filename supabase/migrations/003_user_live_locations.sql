CREATE TABLE IF NOT EXISTS user_live_locations (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL CHECK (lat >= -90 AND lat <= 90),
  lng DOUBLE PRECISION NOT NULL CHECK (lng >= -180 AND lng <= 180),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_live_locations_updated_at
  ON user_live_locations(updated_at DESC);

ALTER TABLE user_live_locations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_live_locations'
      AND policyname = 'authenticated_can_read_user_live_locations'
  ) THEN
    CREATE POLICY "authenticated_can_read_user_live_locations"
      ON user_live_locations
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_live_locations'
      AND policyname = 'authenticated_can_insert_own_user_live_location'
  ) THEN
    CREATE POLICY "authenticated_can_insert_own_user_live_location"
      ON user_live_locations
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_live_locations'
      AND policyname = 'authenticated_can_update_own_user_live_location'
  ) THEN
    CREATE POLICY "authenticated_can_update_own_user_live_location"
      ON user_live_locations
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_live_locations'
      AND policyname = 'authenticated_can_delete_own_user_live_location'
  ) THEN
    CREATE POLICY "authenticated_can_delete_own_user_live_location"
      ON user_live_locations
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;
