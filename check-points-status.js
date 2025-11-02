import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Fantasy',
  password: 'P@rvezn00r',
  port: 5432,
});

async function checkPointsStatus() {
  try {
    console.log('\n=== Checking Points Calculation Status ===\n');

    // Check matches with stats
    const matchesWithStats = await pool.query(`
      SELECT DISTINCT 
        lm.id as league_match_id,
        lm.match_id,
        lm.match_description,
        COUNT(DISTINCT pbs.player_id) as batting_players,
        COUNT(DISTINCT pbows.player_id) as bowling_players
      FROM league_matches lm
      LEFT JOIN player_batting_stats pbs ON lm.match_id = pbs.match_id
      LEFT JOIN player_bowling_stats pbows ON lm.match_id = pbows.match_id
      WHERE lm.league_id = 84
      GROUP BY lm.id, lm.match_id, lm.match_description
      HAVING COUNT(DISTINCT pbs.player_id) > 0
      ORDER BY lm.id
      LIMIT 20
    `);

    console.log(`Matches with player stats available: ${matchesWithStats.rows.length}\n`);

    // Check which have points calculated
    const pointsStatus = await pool.query(`
      SELECT 
        lm.id as league_match_id,
        lm.match_description,
        COUNT(DISTINCT pbs.player_id) as players_with_stats,
        COUNT(DISTINCT tms.id) as teams_with_points
      FROM league_matches lm
      LEFT JOIN player_batting_stats pbs ON lm.match_id = pbs.match_id
      LEFT JOIN team_match_scores tms ON lm.id = tms.match_id
      WHERE lm.league_id = 84
      GROUP BY lm.id, lm.match_description
      HAVING COUNT(DISTINCT pbs.player_id) > 0
      ORDER BY lm.id
      LIMIT 20
    `);

    console.log('Points Calculation Status:');
    console.table(pointsStatus.rows);

    // Current team_match_scores
    const currentScores = await pool.query(`
      SELECT 
        lm.match_description,
        ft.team_name,
        tms.total_points,
        tms.captain_points,
        tms.vice_captain_points
      FROM team_match_scores tms
      JOIN league_matches lm ON tms.match_id = lm.id
      JOIN fantasy_teams ft ON tms.team_id = ft.id
      WHERE lm.league_id = 84
      ORDER BY lm.id, ft.team_name
    `);

    console.log(`\nCurrent scores in database: ${currentScores.rows.length} records`);
    console.table(currentScores.rows);

    pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    pool.end();
  }
}

checkPointsStatus();
