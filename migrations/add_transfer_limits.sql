-- Migration: Add transfer limits and tracking for Playing XI
-- Date: October 25, 2025
-- Purpose: Track player transfers and captain/VC changes across matches

-- Add transfer limit columns to fantasy_leagues
ALTER TABLE fantasy_leagues 
ADD COLUMN IF NOT EXISTS max_transfers INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS allow_captain_changes BOOLEAN DEFAULT TRUE;

-- Add transfer tracking to fantasy_teams
ALTER TABLE fantasy_teams
ADD COLUMN IF NOT EXISTS transfers_made INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS captain_changes_made INTEGER DEFAULT 0;

-- Create table to track individual transfer history
CREATE TABLE IF NOT EXISTS playing_xi_transfers (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL,
  league_id INTEGER NOT NULL,
  match_id INTEGER NOT NULL,
  transfer_type VARCHAR(20) NOT NULL, -- 'player_in', 'player_out', 'captain', 'vice_captain'
  player_id VARCHAR(50),
  player_name VARCHAR(255),
  previous_player_id VARCHAR(50), -- For substitutions
  previous_player_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_team FOREIGN KEY (team_id) REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_league FOREIGN KEY (league_id) REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
  CONSTRAINT fk_match FOREIGN KEY (match_id) REFERENCES league_matches(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_transfers_team ON playing_xi_transfers(team_id);
CREATE INDEX IF NOT EXISTS idx_transfers_league ON playing_xi_transfers(league_id);
CREATE INDEX IF NOT EXISTS idx_transfers_match ON playing_xi_transfers(match_id);
CREATE INDEX IF NOT EXISTS idx_transfers_type ON playing_xi_transfers(transfer_type);

-- Add comment
COMMENT ON TABLE playing_xi_transfers IS 'Tracks all Playing XI changes (player transfers, captain/VC changes) for audit and limit enforcement';

COMMIT;
