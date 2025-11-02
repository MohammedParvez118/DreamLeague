-- Migration: Add fielding statistics tables
-- Extracts catches, stumpings, and run-outs from dismissal information

-- Create fielding stats table
CREATE TABLE IF NOT EXISTS player_fielding_stats (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL,
    innings_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL, -- Fielder's ID
    player_name VARCHAR(100) NOT NULL, -- Fielder's name
    catches INTEGER DEFAULT 0,
    stumpings INTEGER DEFAULT 0,
    runouts_direct INTEGER DEFAULT 0,
    runouts_indirect INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(match_id, innings_id, player_id)
);

-- Create dismissal details table (enhanced tracking)
CREATE TABLE IF NOT EXISTS dismissal_details (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL,
    innings_id INTEGER NOT NULL,
    batsman_id INTEGER NOT NULL,
    batsman_name VARCHAR(100) NOT NULL,
    dismissal_type VARCHAR(50) NOT NULL, -- 'caught', 'bowled', 'lbw', 'stumped', 'run_out', 'hit_wicket', etc.
    bowler_id INTEGER, -- Bowler who got the wicket (null for run-outs)
    bowler_name VARCHAR(100),
    fielder_id INTEGER, -- Catcher/stumper/run-out fielder
    fielder_name VARCHAR(100),
    is_direct_hit BOOLEAN DEFAULT false, -- For run-outs
    dismissal_text TEXT, -- Original outdec text for reference
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(match_id, innings_id, batsman_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_fielding_stats_match_id ON player_fielding_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_fielding_stats_player_id ON player_fielding_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_dismissal_details_match_id ON dismissal_details(match_id);
CREATE INDEX IF NOT EXISTS idx_dismissal_details_bowler_id ON dismissal_details(bowler_id);
CREATE INDEX IF NOT EXISTS idx_dismissal_details_fielder_id ON dismissal_details(fielder_id);

-- Comments
COMMENT ON TABLE player_fielding_stats IS 'Aggregated fielding statistics per player per innings';
COMMENT ON TABLE dismissal_details IS 'Detailed dismissal information parsed from outdec field';
COMMENT ON COLUMN dismissal_details.is_direct_hit IS 'True if run-out was a direct hit (single fielder)';
