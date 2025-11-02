-- Migration: Create tables for match scorecards and player statistics
-- This will store detailed scorecard data fetched from RapidAPI

-- Main scorecard table (stores innings-level data)
CREATE TABLE IF NOT EXISTS match_scorecards (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL,
    innings_id INTEGER NOT NULL,
    innings_number INTEGER NOT NULL, -- 1 for first innings, 2 for second
    batting_team_name VARCHAR(100) NOT NULL,
    batting_team_short_name VARCHAR(10) NOT NULL,
    total_score INTEGER NOT NULL,
    total_wickets INTEGER NOT NULL,
    total_overs DECIMAL(5,2) NOT NULL,
    run_rate DECIMAL(5,2) NOT NULL,
    extras_total INTEGER DEFAULT 0,
    extras_wides INTEGER DEFAULT 0,
    extras_noballs INTEGER DEFAULT 0,
    extras_byes INTEGER DEFAULT 0,
    extras_legbyes INTEGER DEFAULT 0,
    extras_penalty INTEGER DEFAULT 0,
    is_declared BOOLEAN DEFAULT false,
    is_followon BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(match_id, innings_id)
);

-- Player batting statistics
CREATE TABLE IF NOT EXISTS player_batting_stats (
    id SERIAL PRIMARY KEY,
    scorecard_id INTEGER REFERENCES match_scorecards(id) ON DELETE CASCADE,
    match_id INTEGER NOT NULL,
    innings_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL, -- RapidAPI player ID
    player_name VARCHAR(100) NOT NULL,
    player_nickname VARCHAR(100),
    runs INTEGER NOT NULL,
    balls_faced INTEGER NOT NULL,
    fours INTEGER NOT NULL,
    sixes INTEGER NOT NULL,
    strike_rate DECIMAL(6,2) NOT NULL,
    dismissal_info TEXT, -- e.g., "c Fielder b Bowler"
    is_captain BOOLEAN DEFAULT false,
    is_keeper BOOLEAN DEFAULT false,
    is_overseas BOOLEAN DEFAULT false,
    batting_position INTEGER, -- Order in which they batted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(match_id, innings_id, player_id)
);

-- Player bowling statistics
CREATE TABLE IF NOT EXISTS player_bowling_stats (
    id SERIAL PRIMARY KEY,
    scorecard_id INTEGER REFERENCES match_scorecards(id) ON DELETE CASCADE,
    match_id INTEGER NOT NULL,
    innings_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL, -- RapidAPI player ID
    player_name VARCHAR(100) NOT NULL,
    player_nickname VARCHAR(100),
    overs DECIMAL(3,1) NOT NULL,
    maidens INTEGER NOT NULL,
    runs_conceded INTEGER NOT NULL,
    wickets INTEGER NOT NULL,
    economy DECIMAL(5,2) NOT NULL,
    dots INTEGER DEFAULT 0,
    balls_bowled INTEGER NOT NULL,
    is_captain BOOLEAN DEFAULT false,
    is_keeper BOOLEAN DEFAULT false,
    is_overseas BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(match_id, innings_id, player_id)
);

-- Fall of wickets table
CREATE TABLE IF NOT EXISTS fall_of_wickets (
    id SERIAL PRIMARY KEY,
    scorecard_id INTEGER REFERENCES match_scorecards(id) ON DELETE CASCADE,
    match_id INTEGER NOT NULL,
    innings_id INTEGER NOT NULL,
    batsman_id INTEGER NOT NULL,
    batsman_name VARCHAR(100) NOT NULL,
    wicket_number INTEGER NOT NULL, -- 1st wicket, 2nd wicket, etc.
    runs_at_fall INTEGER NOT NULL,
    over_number DECIMAL(3,1) NOT NULL,
    ball_number INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Partnership details table
CREATE TABLE IF NOT EXISTS partnerships (
    id SERIAL PRIMARY KEY,
    scorecard_id INTEGER REFERENCES match_scorecards(id) ON DELETE CASCADE,
    match_id INTEGER NOT NULL,
    innings_id INTEGER NOT NULL,
    partnership_number INTEGER NOT NULL,
    batsman1_id INTEGER NOT NULL,
    batsman1_name VARCHAR(100) NOT NULL,
    batsman1_runs INTEGER NOT NULL,
    batsman1_balls INTEGER NOT NULL,
    batsman1_fours INTEGER NOT NULL,
    batsman1_sixes INTEGER NOT NULL,
    batsman2_id INTEGER NOT NULL,
    batsman2_name VARCHAR(100) NOT NULL,
    batsman2_runs INTEGER NOT NULL,
    batsman2_balls INTEGER NOT NULL,
    batsman2_fours INTEGER NOT NULL,
    batsman2_sixes INTEGER NOT NULL,
    total_runs INTEGER NOT NULL,
    total_balls INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Match summary table (stores overall match info)
CREATE TABLE IF NOT EXISTS match_summaries (
    id SERIAL PRIMARY KEY,
    match_id INTEGER UNIQUE NOT NULL,
    match_status VARCHAR(200) NOT NULL, -- "Ireland won by 9 runs"
    is_match_complete BOOLEAN DEFAULT false,
    rapidapi_match_id INTEGER, -- Original match ID from RapidAPI
    seo_title TEXT,
    web_url TEXT,
    response_last_updated BIGINT, -- Unix timestamp from API
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_match_scorecards_match_id ON match_scorecards(match_id);
CREATE INDEX IF NOT EXISTS idx_player_batting_stats_match_id ON player_batting_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_player_batting_stats_player_id ON player_batting_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_bowling_stats_match_id ON player_bowling_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_player_bowling_stats_player_id ON player_bowling_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_fall_of_wickets_match_id ON fall_of_wickets(match_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_match_id ON partnerships(match_id);

-- Comments
COMMENT ON TABLE match_scorecards IS 'Stores innings-level scorecard data for each match';
COMMENT ON TABLE player_batting_stats IS 'Stores individual batsman statistics for each innings';
COMMENT ON TABLE player_bowling_stats IS 'Stores individual bowler statistics for each innings';
COMMENT ON TABLE fall_of_wickets IS 'Tracks wicket falls during an innings';
COMMENT ON TABLE partnerships IS 'Tracks partnerships between batsmen';
COMMENT ON TABLE match_summaries IS 'Stores overall match information and status';
