-- Players
CREATE TABLE players (
  player_id INTEGER PRIMARY KEY,
  player_name TEXT,
  team_id INTEGER,
  role TEXT -- e.g. batsman, bowler, allrounder
);

-- Matches
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id),
  match_id INTEGER PRIMARY KEY,
  team1 TEXT,
  team2 TEXT,
  match_description TEXT,
  start_time BIGINT
);

-- Player performance
CREATE TABLE player_performance (
  id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(match_id),
  player_id INTEGER REFERENCES players(player_id),
  runs INTEGER DEFAULT 0,
  wickets INTEGER DEFAULT 0,
  catches INTEGER DEFAULT 0,
  fantasy_points INTEGER DEFAULT 0
);
