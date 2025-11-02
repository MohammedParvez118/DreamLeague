-- Migration: Add transfer limit and free captain/VC changes tracking
-- Date: October 27, 2025

-- 1. Add transfer limit column to fantasy_leagues table (if not exists)
ALTER TABLE fantasy_leagues 
ADD COLUMN IF NOT EXISTS transfer_limit INTEGER DEFAULT 10;

-- 2. Update fantasy_teams to track free changes used
-- Remove old columns
ALTER TABLE fantasy_teams 
DROP COLUMN IF EXISTS transfers_made_from_baseline,
DROP COLUMN IF EXISTS captain_changes_made;

-- Add new columns for finalized logic
ALTER TABLE fantasy_teams 
ADD COLUMN IF NOT EXISTS captain_free_change_used BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vice_captain_free_change_used BOOLEAN DEFAULT FALSE;

-- 3. Add comments for documentation
COMMENT ON COLUMN fantasy_leagues.transfer_limit IS 'Total transfers allowed per team in this league (set by admin)';
COMMENT ON COLUMN fantasy_teams.captain_free_change_used IS 'Whether the team has used their one free captain change';
COMMENT ON COLUMN fantasy_teams.vice_captain_free_change_used IS 'Whether the team has used their one free vice-captain change';

-- 4. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_team_playing_xi_team_match 
ON team_playing_xi(team_id, match_id);

CREATE INDEX IF NOT EXISTS idx_league_matches_start_time 
ON league_matches(league_id, match_start);

-- 5. Sample data update (set default transfer limit for existing leagues)
UPDATE fantasy_leagues 
SET transfer_limit = 10 
WHERE transfer_limit IS NULL;

-- Migration complete
-- Next steps: Update API logic to use new schema
