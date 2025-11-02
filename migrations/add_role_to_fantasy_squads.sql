-- Add role column to fantasy_squads table
-- This will help with validation and display of player roles

ALTER TABLE fantasy_squads 
ADD COLUMN IF NOT EXISTS role VARCHAR(100);

COMMENT ON COLUMN fantasy_squads.role IS 'Player role (Wicket-keeper, Batsman, Batting Allrounder, Bowling Allrounder, Bowler)';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_fantasy_squads_role ON fantasy_squads(role);

-- Update existing records with roles from squad_players table (if available)
-- Match by player name
UPDATE fantasy_squads fs
SET role = sp.role
FROM squad_players sp
WHERE sp.name = fs.player_id
AND fs.role IS NULL;

-- Also try to match by player_id if it's numeric
UPDATE fantasy_squads fs
SET role = sp.role
FROM squad_players sp
WHERE fs.player_id ~ '^\d+$' -- Check if player_id is numeric
AND fs.player_id::INTEGER = sp.player_id
AND fs.role IS NULL;
