-- Add player_id and squad_name to fantasy_squads table for better tracking
-- This will help prevent duplicate player selections

-- Add player_id column to store the actual player ID from squad_players
ALTER TABLE fantasy_squads ADD COLUMN IF NOT EXISTS player_id VARCHAR(50);

-- Add squad_name to track which team the player belongs to
ALTER TABLE fantasy_squads ADD COLUMN IF NOT EXISTS squad_name VARCHAR(255);

-- Add created_at timestamp
ALTER TABLE fantasy_squads ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create a unique index to prevent the same player from being selected by multiple teams
-- This creates a UNIQUE constraint across league_id and player_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_fantasy_squads_league_player 
ON fantasy_squads(league_id, player_id) 
WHERE player_id IS NOT NULL;

-- Add comment for clarity
COMMENT ON INDEX idx_fantasy_squads_league_player IS 'Ensures each player can only be selected once per league';
