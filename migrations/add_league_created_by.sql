-- Add created_by column to fantasy_leagues table
ALTER TABLE fantasy_leagues 
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

-- Add comment to explain the column
COMMENT ON COLUMN fantasy_leagues.created_by IS 'Email of the user who created the league';

-- Optional: Update existing leagues to set created_by from the first team owner
-- This assumes the first team in a league is usually the creator
UPDATE fantasy_leagues fl
SET created_by = (
  SELECT team_owner 
  FROM fantasy_teams ft 
  WHERE ft.league_id = fl.id 
  ORDER BY ft.id ASC 
  LIMIT 1
)
WHERE created_by IS NULL;
