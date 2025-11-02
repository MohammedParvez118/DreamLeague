-- Migration to update fantasy_leagues table structure
-- Run this script to update the database schema

-- Add new columns to fantasy_leagues table
ALTER TABLE fantasy_leagues 
ADD COLUMN IF NOT EXISTS privacy VARCHAR(10) DEFAULT 'public',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS tournament_id INTEGER,
ADD COLUMN IF NOT EXISTS league_code VARCHAR(20) UNIQUE;

-- Drop old columns that are no longer needed
ALTER TABLE fantasy_leagues 
DROP COLUMN IF EXISTS selection_mode,
DROP COLUMN IF EXISTS point_system;

-- Add foreign key constraint for tournament_id (if tournaments table exists)
-- ALTER TABLE fantasy_leagues 
-- ADD CONSTRAINT fk_tournament 
-- FOREIGN KEY (tournament_id) REFERENCES tournaments(series_id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_league_code ON fantasy_leagues(league_code);
CREATE INDEX IF NOT EXISTS idx_privacy ON fantasy_leagues(privacy);
CREATE INDEX IF NOT EXISTS idx_tournament_id ON fantasy_leagues(tournament_id);

-- Update existing records to have 'public' privacy
UPDATE fantasy_leagues 
SET privacy = 'public' 
WHERE privacy IS NULL;

COMMIT;
