-- Add squad_size column to fantasy_leagues table
-- This defines how many players each team must select in the league

ALTER TABLE fantasy_leagues ADD COLUMN IF NOT EXISTS squad_size INTEGER DEFAULT 15;

-- Add constraint to ensure squad size is between 15-20
ALTER TABLE fantasy_leagues ADD CONSTRAINT check_squad_size CHECK (squad_size >= 15 AND squad_size <= 20);

-- Add comment for clarity
COMMENT ON COLUMN fantasy_leagues.squad_size IS 'Number of players each team must select (15-20)';
