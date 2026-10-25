-- ============================================================
-- FUN TOGETHER — SUPABASE DATABASE SCHEMA
-- Run this in your Supabase project's SQL Editor (Dashboard -> SQL Editor)
-- ============================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_index INT DEFAULT 0,
  favorite_animal TEXT DEFAULT 'bear',
  total_races INT DEFAULT 0,
  best_time_ms INT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- 3. Game Rooms Table
CREATE TABLE IF NOT EXISTS public.game_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code VARCHAR(10) UNIQUE NOT NULL,
  host_id TEXT NOT NULL,
  host_name TEXT NOT NULL,
  level_id INT DEFAULT 1,
  status VARCHAR(20) DEFAULT 'lobby', -- 'lobby', 'countdown', 'playing', 'finished'
  max_players INT DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast room_code lookups
CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON public.game_rooms(room_code);

-- Enable RLS on game_rooms
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anonymous/guest players) to read, create and update rooms
CREATE POLICY "Allow public read on game_rooms" 
  ON public.game_rooms FOR SELECT 
  USING (true);

CREATE POLICY "Allow public insert on game_rooms" 
  ON public.game_rooms FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public update on game_rooms" 
  ON public.game_rooms FOR UPDATE 
  USING (true);

CREATE POLICY "Allow public delete on game_rooms" 
  ON public.game_rooms FOR DELETE 
  USING (true);

-- 4. Room Players Table
CREATE TABLE IF NOT EXISTS public.room_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code VARCHAR(10) NOT NULL REFERENCES public.game_rooms(room_code) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  seat_index INT NOT NULL,
  character_animal VARCHAR(20) DEFAULT 'bear', -- 'bear', 'hippo', 'frog', 'rhino'
  is_ready BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT true,
  last_ping TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_code, player_id)
);

CREATE INDEX IF NOT EXISTS idx_room_players_code ON public.room_players(room_code);

-- Enable RLS on room_players
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on room_players" 
  ON public.room_players FOR SELECT 
  USING (true);

CREATE POLICY "Allow public insert on room_players" 
  ON public.room_players FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public update on room_players" 
  ON public.room_players FOR UPDATE 
  USING (true);

CREATE POLICY "Allow public delete on room_players" 
  ON public.room_players FOR DELETE 
  USING (true);

-- 5. Leaderboards / Race Records Table
CREATE TABLE IF NOT EXISTS public.game_leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level_id INT NOT NULL,
  room_code VARCHAR(10),
  player_names TEXT[] NOT NULL,
  time_ms INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_level ON public.game_leaderboard(level_id, time_ms ASC);

ALTER TABLE public.game_leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on game_leaderboard" 
  ON public.game_leaderboard FOR SELECT 
  USING (true);

CREATE POLICY "Allow public insert on game_leaderboard" 
  ON public.game_leaderboard FOR INSERT 
  WITH CHECK (true);

-- 6. Realtime Publications
-- Add tables to realtime publication so clients receive instant room updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'room_players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
  END IF;
END $$;

-- 7. Helper Function: Clean Stale Rooms older than 2 hours
CREATE OR REPLACE FUNCTION clean_stale_game_rooms()
RETURNS void AS $$
BEGIN
  DELETE FROM public.game_rooms WHERE created_at < now() - INTERVAL '2 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
