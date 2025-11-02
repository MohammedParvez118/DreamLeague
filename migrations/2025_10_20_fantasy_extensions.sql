-- ============================================================================
-- FANTASY LEAGUE EXTENSIONS MIGRATION
-- Version: 1.0.0
-- Date: 2025-10-20
-- Description: Extended league functionality with Playing XI, Transfers, 
--              Points System, and Leaderboard
-- ============================================================================

-- ============================================================================
-- 1. MODIFY EXISTING TABLES
-- ============================================================================

-- 1.1 Add new columns to fantasy_leagues
ALTER TABLE fantasy_leagues
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS transfer_limit INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS match_deadline_type VARCHAR(20) DEFAULT 'per_match';

-- Add comments for documentation
COMMENT ON COLUMN fantasy_leagues.start_date IS 'League start date (usually tournament start)';
COMMENT ON COLUMN fantasy_leagues.end_date IS 'League end date (usually tournament end)';
COMMENT ON COLUMN fantasy_leagues.transfer_limit IS 'Maximum number of player transfers allowed per team';
COMMENT ON COLUMN fantasy_leagues.match_deadline_type IS 'Deadline type: per_match or weekly';

-- ============================================================================
-- 2. NEW TABLES
-- ============================================================================

-- 2.1 League Matches Table
-- Links specific tournament matches to leagues
CREATE TABLE IF NOT EXISTS league_matches (
  id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
  match_id INTEGER NOT NULL,
  match_start TIMESTAMP NOT NULL,
  match_description VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(league_id, match_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_league_matches_league_id ON league_matches(league_id);
CREATE INDEX IF NOT EXISTS idx_league_matches_match_id ON league_matches(match_id);
CREATE INDEX IF NOT EXISTS idx_league_matches_start ON league_matches(match_start);
CREATE INDEX IF NOT EXISTS idx_league_matches_active ON league_matches(league_id, is_active);
CREATE INDEX IF NOT EXISTS idx_league_matches_completed ON league_matches(league_id, is_completed);

COMMENT ON TABLE league_matches IS 'Tournament matches associated with fantasy leagues';
COMMENT ON COLUMN league_matches.is_active IS 'True if match is ongoing or upcoming';
COMMENT ON COLUMN league_matches.is_completed IS 'True if match result is finalized and points calculated';

-- 2.2 Team Playing XI Table
-- Stores match-wise Playing XI selections
CREATE TABLE IF NOT EXISTS team_playing_xi (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  league_id INTEGER NOT NULL REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
  match_id INTEGER NOT NULL REFERENCES league_matches(id) ON DELETE CASCADE,
  player_id VARCHAR(50) NOT NULL,
  player_name TEXT,
  player_role VARCHAR(50),
  squad_name VARCHAR(100),
  is_captain BOOLEAN DEFAULT FALSE,
  is_vice_captain BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_player_per_team_match UNIQUE(team_id, match_id, player_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_playing_xi_team_match ON team_playing_xi(team_id, match_id);
CREATE INDEX IF NOT EXISTS idx_playing_xi_league ON team_playing_xi(league_id);
CREATE INDEX IF NOT EXISTS idx_playing_xi_player ON team_playing_xi(player_id);
CREATE INDEX IF NOT EXISTS idx_playing_xi_captain ON team_playing_xi(team_id, match_id, is_captain) WHERE is_captain = TRUE;
CREATE INDEX IF NOT EXISTS idx_playing_xi_vice_captain ON team_playing_xi(team_id, match_id, is_vice_captain) WHERE is_vice_captain = TRUE;

COMMENT ON TABLE team_playing_xi IS 'Match-wise Playing XI selections (11 players per team per match)';
COMMENT ON COLUMN team_playing_xi.player_id IS 'References player from fantasy_squads';

-- 2.3 Team Match Scores Table
-- Stores calculated fantasy points per match
CREATE TABLE IF NOT EXISTS team_match_scores (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  league_id INTEGER NOT NULL REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
  match_id INTEGER NOT NULL REFERENCES league_matches(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  rank_in_match INTEGER,
  captain_points INTEGER DEFAULT 0,
  vice_captain_points INTEGER DEFAULT 0,
  regular_points INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, match_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_scores_team ON team_match_scores(team_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_league ON team_match_scores(league_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_match ON team_match_scores(match_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_points ON team_match_scores(league_id, total_points DESC);
CREATE INDEX IF NOT EXISTS idx_match_scores_rank ON team_match_scores(match_id, rank_in_match);

COMMENT ON TABLE team_match_scores IS 'Calculated fantasy points per team per match';
COMMENT ON COLUMN team_match_scores.total_points IS 'Sum of all player points (with C/VC multipliers)';
COMMENT ON COLUMN team_match_scores.captain_points IS 'Captain points × 2';
COMMENT ON COLUMN team_match_scores.vice_captain_points IS 'Vice-captain points × 1.5';
COMMENT ON COLUMN team_match_scores.regular_points IS 'Sum of other 9 players';

-- 2.4 Squad Transfers Table
-- Tracks player transfers (swaps)
CREATE TABLE IF NOT EXISTS squad_transfers (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  league_id INTEGER NOT NULL REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
  from_player_id VARCHAR(50) NOT NULL,
  from_player_name TEXT,
  to_player_id VARCHAR(50) NOT NULL,
  to_player_name TEXT,
  transfer_date TIMESTAMP DEFAULT NOW(),
  used_transfer_count INTEGER DEFAULT 1,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'completed',
  CONSTRAINT check_different_players CHECK (from_player_id != to_player_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transfers_team ON squad_transfers(team_id);
CREATE INDEX IF NOT EXISTS idx_transfers_league ON squad_transfers(league_id);
CREATE INDEX IF NOT EXISTS idx_transfers_date ON squad_transfers(transfer_date DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_from_player ON squad_transfers(from_player_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_player ON squad_transfers(to_player_id);

COMMENT ON TABLE squad_transfers IS 'History of player transfers/swaps within leagues';
COMMENT ON COLUMN squad_transfers.used_transfer_count IS 'Number of transfers used (usually 1, could be more for multiple swaps)';
COMMENT ON COLUMN squad_transfers.status IS 'Transfer status: completed, pending, failed';

-- ============================================================================
-- 3. VIEWS FOR EASY QUERYING
-- ============================================================================

-- 3.1 Leaderboard View
-- Aggregates total points per team across all matches
CREATE OR REPLACE VIEW league_leaderboard AS
SELECT 
  tms.league_id,
  tms.team_id,
  ft.team_name,
  ft.team_owner,
  SUM(tms.total_points) AS total_points,
  COUNT(tms.id) AS matches_played,
  AVG(tms.total_points)::INTEGER AS avg_points_per_match,
  MAX(tms.total_points) AS highest_match_score,
  MIN(tms.total_points) AS lowest_match_score,
  RANK() OVER (PARTITION BY tms.league_id ORDER BY SUM(tms.total_points) DESC) AS rank
FROM team_match_scores tms
JOIN fantasy_teams ft ON tms.team_id = ft.id
GROUP BY tms.league_id, tms.team_id, ft.team_name, ft.team_owner
ORDER BY rank;

COMMENT ON VIEW league_leaderboard IS 'Aggregated leaderboard showing team rankings by total points';

-- 3.2 Team Transfer Summary View
-- Shows remaining transfers per team
CREATE OR REPLACE VIEW team_transfer_summary AS
SELECT 
  ft.id AS team_id,
  ft.league_id,
  ft.team_name,
  ft.team_owner,
  fl.transfer_limit,
  COALESCE(SUM(st.used_transfer_count), 0) AS transfers_used,
  fl.transfer_limit - COALESCE(SUM(st.used_transfer_count), 0) AS transfers_remaining
FROM fantasy_teams ft
JOIN fantasy_leagues fl ON ft.league_id = fl.id
LEFT JOIN squad_transfers st ON ft.id = st.team_id
GROUP BY ft.id, ft.league_id, ft.team_name, ft.team_owner, fl.transfer_limit;

COMMENT ON VIEW team_transfer_summary IS 'Shows remaining transfers available for each team';

-- 3.3 Top Performers View
-- Shows top players by total fantasy points in tournament
CREATE OR REPLACE VIEW tournament_top_performers AS
SELECT 
  lm.league_id,
  tpxi.player_id,
  tpxi.player_name,
  tpxi.squad_name AS cricket_team,
  tpxi.player_role,
  COUNT(DISTINCT tpxi.match_id) AS matches_played,
  COUNT(DISTINCT tpxi.team_id) AS picked_by_teams,
  SUM(tms.total_points) AS total_fantasy_points,
  AVG(tms.total_points)::INTEGER AS avg_points_per_match
FROM team_playing_xi tpxi
JOIN league_matches lm ON tpxi.match_id = lm.id
JOIN team_match_scores tms ON tpxi.team_id = tms.team_id AND tpxi.match_id = lm.id
GROUP BY lm.league_id, tpxi.player_id, tpxi.player_name, tpxi.squad_name, tpxi.player_role
ORDER BY total_fantasy_points DESC;

COMMENT ON VIEW tournament_top_performers IS 'Top players ranked by total fantasy points across all matches';

-- ============================================================================
-- 4. TRIGGERS FOR AUTO-UPDATES
-- ============================================================================

-- 4.1 Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
DROP TRIGGER IF EXISTS update_league_matches_updated_at ON league_matches;
CREATE TRIGGER update_league_matches_updated_at
  BEFORE UPDATE ON league_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_playing_xi_updated_at ON team_playing_xi;
CREATE TRIGGER update_playing_xi_updated_at
  BEFORE UPDATE ON team_playing_xi
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_match_scores_updated_at ON team_match_scores;
CREATE TRIGGER update_match_scores_updated_at
  BEFORE UPDATE ON team_match_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4.2 Validate Playing XI before insert
CREATE OR REPLACE FUNCTION validate_playing_xi()
RETURNS TRIGGER AS $$
DECLARE
  player_count INTEGER;
  captain_count INTEGER;
  vice_captain_count INTEGER;
BEGIN
  -- Check if player is in team's squad
  IF NOT EXISTS (
    SELECT 1 FROM fantasy_squads fs
    WHERE fs.team_id = NEW.team_id 
    AND fs.player_id = NEW.player_id
  ) THEN
    RAISE EXCEPTION 'Player % not in team squad', NEW.player_id;
  END IF;

  -- Count players for this team-match combination
  SELECT COUNT(*) INTO player_count
  FROM team_playing_xi
  WHERE team_id = NEW.team_id AND match_id = NEW.match_id;

  IF player_count >= 11 THEN
    RAISE EXCEPTION 'Playing XI already has 11 players for this match';
  END IF;

  -- Validate only one captain
  IF NEW.is_captain THEN
    SELECT COUNT(*) INTO captain_count
    FROM team_playing_xi
    WHERE team_id = NEW.team_id 
    AND match_id = NEW.match_id 
    AND is_captain = TRUE
    AND id != COALESCE(NEW.id, 0);
    
    IF captain_count > 0 THEN
      RAISE EXCEPTION 'Team already has a captain for this match';
    END IF;
  END IF;

  -- Validate only one vice-captain
  IF NEW.is_vice_captain THEN
    SELECT COUNT(*) INTO vice_captain_count
    FROM team_playing_xi
    WHERE team_id = NEW.team_id 
    AND match_id = NEW.match_id 
    AND is_vice_captain = TRUE
    AND id != COALESCE(NEW.id, 0);
    
    IF vice_captain_count > 0 THEN
      RAISE EXCEPTION 'Team already has a vice-captain for this match';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_playing_xi_insert ON team_playing_xi;
CREATE TRIGGER validate_playing_xi_insert
  BEFORE INSERT OR UPDATE ON team_playing_xi
  FOR EACH ROW
  EXECUTE FUNCTION validate_playing_xi();

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- 5.1 Function to get remaining transfers for a team
CREATE OR REPLACE FUNCTION get_remaining_transfers(p_team_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_transfer_limit INTEGER;
  v_used_transfers INTEGER;
BEGIN
  SELECT fl.transfer_limit INTO v_transfer_limit
  FROM fantasy_teams ft
  JOIN fantasy_leagues fl ON ft.league_id = fl.id
  WHERE ft.id = p_team_id;

  SELECT COALESCE(SUM(used_transfer_count), 0) INTO v_used_transfers
  FROM squad_transfers
  WHERE team_id = p_team_id;

  RETURN v_transfer_limit - v_used_transfers;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_remaining_transfers IS 'Returns number of transfers remaining for a team';

-- 5.2 Function to check if match deadline has passed
CREATE OR REPLACE FUNCTION is_match_locked(p_match_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_match_start TIMESTAMP;
BEGIN
  SELECT match_start INTO v_match_start
  FROM league_matches
  WHERE id = p_match_id;

  RETURN NOW() >= v_match_start;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_match_locked IS 'Returns true if match has started (deadline passed)';

-- ============================================================================
-- 6. SAMPLE DATA VALIDATION QUERIES
-- ============================================================================

-- Check if migration was successful
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'MIGRATION VALIDATION';
  RAISE NOTICE '============================================';
  
  -- Check fantasy_leagues new columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fantasy_leagues' AND column_name = 'transfer_limit'
  ) THEN
    RAISE NOTICE '✅ fantasy_leagues.transfer_limit column added';
  END IF;

  -- Check new tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'league_matches') THEN
    RAISE NOTICE '✅ league_matches table created';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_playing_xi') THEN
    RAISE NOTICE '✅ team_playing_xi table created';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_match_scores') THEN
    RAISE NOTICE '✅ team_match_scores table created';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'squad_transfers') THEN
    RAISE NOTICE '✅ squad_transfers table created';
  END IF;

  -- Check views
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'league_leaderboard') THEN
    RAISE NOTICE '✅ league_leaderboard view created';
  END IF;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '============================================';
END $$;
