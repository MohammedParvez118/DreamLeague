-- Squad Replacement System Migration
-- Date: November 1, 2025
-- Purpose: Replace "Transfers" with "Replacements" for injured/unavailable players

BEGIN;

-- ============================================================================
-- 1. Create squad_replacements table
-- ============================================================================

CREATE TABLE IF NOT EXISTS squad_replacements (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  league_id INTEGER NOT NULL REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
  
  -- Player being replaced
  out_player_id VARCHAR(50) NOT NULL,
  out_player_name TEXT NOT NULL,
  out_player_role VARCHAR(50),
  out_player_squad VARCHAR(100),
  
  -- Replacement player
  in_player_id VARCHAR(50) NOT NULL,
  in_player_name TEXT NOT NULL,
  in_player_role VARCHAR(50),
  in_player_squad VARCHAR(100),
  
  -- Replacement details
  reason TEXT NOT NULL, -- User provided reason
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  
  -- Points preservation (stays with injured player)
  points_at_replacement INTEGER DEFAULT 0, -- Points earned before injury
  matches_played INTEGER DEFAULT 0, -- Matches played before injury
  
  -- Admin action
  admin_email VARCHAR(255), -- League creator who reviewed
  admin_notes TEXT, -- Admin's reasoning for approval/rejection
  reviewed_at TIMESTAMP,
  
  -- Replacement timing (next match onwards)
  replacement_start_match_id INTEGER, -- First match where replacement applies
  
  -- Timestamps
  requested_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_status CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT check_different_players CHECK (out_player_id <> in_player_id)
);

-- Indexes
CREATE INDEX idx_squad_replacements_team ON squad_replacements(team_id);
CREATE INDEX idx_squad_replacements_league ON squad_replacements(league_id);
CREATE INDEX idx_squad_replacements_status ON squad_replacements(status);
CREATE INDEX idx_squad_replacements_requested ON squad_replacements(requested_at DESC);

-- Comments
COMMENT ON TABLE squad_replacements IS 'Squad player replacements for injured/unavailable players with admin approval';
COMMENT ON COLUMN squad_replacements.points_at_replacement IS 'Points earned by injured player - stays attributed to them';
COMMENT ON COLUMN squad_replacements.replacement_start_match_id IS 'First match where replacement player takes over';

-- ============================================================================
-- 2. Add injury tracking to fantasy_squads
-- ============================================================================

ALTER TABLE fantasy_squads
ADD COLUMN IF NOT EXISTS is_injured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS injury_replacement_id INTEGER REFERENCES squad_replacements(id);

-- Index for quick filtering
CREATE INDEX IF NOT EXISTS idx_fantasy_squads_injured ON fantasy_squads(team_id, is_injured) WHERE is_injured = TRUE;

-- Comments
COMMENT ON COLUMN fantasy_squads.is_injured IS 'TRUE if player is injured/unavailable and replaced';
COMMENT ON COLUMN fantasy_squads.injury_replacement_id IS 'Links to replacement record if player was replaced';

-- ============================================================================
-- 3. Add admin flag to fantasy_teams
-- ============================================================================

ALTER TABLE fantasy_teams
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Set league creators as admins
UPDATE fantasy_teams ft
SET is_admin = TRUE
FROM fantasy_leagues fl
WHERE ft.league_id = fl.id 
  AND ft.team_owner = fl.created_by;

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_fantasy_teams_admin ON fantasy_teams(league_id, is_admin) WHERE is_admin = TRUE;

COMMENT ON COLUMN fantasy_teams.is_admin IS 'TRUE if team owner is the league creator/admin';

-- ============================================================================
-- 4. Create view for pending replacements (Admin Dashboard)
-- ============================================================================

CREATE OR REPLACE VIEW admin_pending_replacements AS
SELECT 
  sr.id as replacement_id,
  sr.league_id,
  sr.team_id,
  ft.team_name,
  ft.team_owner,
  sr.out_player_id,
  sr.out_player_name,
  sr.out_player_role,
  sr.out_player_squad,
  sr.in_player_id,
  sr.in_player_name,
  sr.in_player_role,
  sr.in_player_squad,
  sr.reason,
  sr.points_at_replacement,
  sr.matches_played,
  sr.requested_at,
  -- Next match info
  (
    SELECT lm.id 
    FROM league_matches lm 
    WHERE lm.league_id = sr.league_id 
      AND lm.match_start > NOW() 
    ORDER BY lm.match_start ASC 
    LIMIT 1
  ) as next_match_id,
  (
    SELECT lm.match_description 
    FROM league_matches lm 
    WHERE lm.league_id = sr.league_id 
      AND lm.match_start > NOW() 
    ORDER BY lm.match_start ASC 
    LIMIT 1
  ) as next_match_description
FROM squad_replacements sr
JOIN fantasy_teams ft ON sr.team_id = ft.id
WHERE sr.status = 'pending'
ORDER BY sr.requested_at ASC;

COMMENT ON VIEW admin_pending_replacements IS 'All pending replacement requests with team and next match info';

-- ============================================================================
-- 5. Create function to auto-replace in future Playing XIs
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_replacement_to_future_matches(
  p_team_id INTEGER,
  p_out_player_id VARCHAR(50),
  p_in_player_id VARCHAR(50),
  p_in_player_name TEXT,
  p_in_player_role VARCHAR(50),
  p_in_player_squad VARCHAR(100),
  p_start_match_id INTEGER
)
RETURNS TABLE(
  match_id INTEGER,
  replaced BOOLEAN,
  was_captain BOOLEAN,
  was_vice_captain BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH future_matches AS (
    SELECT lm.id as match_id
    FROM league_matches lm
    WHERE lm.id >= p_start_match_id
      AND lm.match_start > NOW()
  ),
  replacements AS (
    UPDATE team_playing_xi tpxi
    SET 
      player_id = p_in_player_id,
      player_name = p_in_player_name,
      player_role = p_in_player_role,
      squad_name = p_in_player_squad,
      updated_at = NOW()
    WHERE tpxi.team_id = p_team_id
      AND tpxi.player_id = p_out_player_id
      AND tpxi.match_id IN (SELECT fm.match_id FROM future_matches fm)
    RETURNING 
      tpxi.match_id,
      TRUE as replaced,
      tpxi.is_captain as was_captain,
      tpxi.is_vice_captain as was_vice_captain
  )
  SELECT * FROM replacements;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_replacement_to_future_matches IS 'Auto-replaces injured player in all future Playing XIs';

-- ============================================================================
-- 6. Create trigger to update timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_replacement_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER squad_replacements_update_timestamp
BEFORE UPDATE ON squad_replacements
FOR EACH ROW
EXECUTE FUNCTION update_replacement_timestamp();

COMMIT;

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Squad Replacement System migration completed successfully!';
  RAISE NOTICE '   - squad_replacements table created';
  RAISE NOTICE '   - fantasy_squads.is_injured column added';
  RAISE NOTICE '   - fantasy_teams.is_admin column added and populated';
  RAISE NOTICE '   - admin_pending_replacements view created';
  RAISE NOTICE '   - apply_replacement_to_future_matches() function created';
  RAISE NOTICE '   - Auto-update trigger created';
END $$;
