-- Create profiles table with all required columns
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nickname TEXT,
  email TEXT NOT NULL,
  roll_no TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'CSE',
  year TEXT NOT NULL DEFAULT '1st Year',
  hostel TEXT,
  has_cycle BOOLEAN DEFAULT FALSE,
  profile_emoji TEXT,
  avatar TEXT NOT NULL DEFAULT 'U',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS nickname TEXT,
ADD COLUMN IF NOT EXISTS has_cycle BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS profile_emoji TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create stats table if it doesn't exist
CREATE TABLE IF NOT EXISTS stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  walk_km FLOAT DEFAULT 0,
  cycle_km FLOAT DEFAULT 0,
  auto_rides INT DEFAULT 0,
  co2_saved FLOAT DEFAULT 0,
  streak INT DEFAULT 0,
  eco_score FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: users can read any profile
CREATE POLICY "users_can_read_profiles" ON profiles
  FOR SELECT
  USING (true);

-- Create RLS policy: users can update their own profile
CREATE POLICY "users_can_update_own_profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Create RLS policy: users can insert their own profile
CREATE POLICY "users_can_insert_own_profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Enable RLS on stats table
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: users can read any stats
CREATE POLICY "users_can_read_stats" ON stats
  FOR SELECT
  USING (true);

-- Create RLS policy: users can update their own stats
CREATE POLICY "users_can_update_own_stats" ON stats
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create RLS policy: users can insert their own stats
CREATE POLICY "users_can_insert_own_stats" ON stats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
