import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Fantasy',
  password: 'P@rvezn00r',
  port: 5432,
});

async function checkLeaderboard() {
  try {
    console.log('\n=== Checking Leaderboard Data for League 84 ===\n');

    // Check team_match_scores
    const scoresCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM team_match_scores 
      WHERE league_id = 84
    `);
    console.log('1. team_match_scores records for League 84:', scoresCheck.rows[0].count);

    // Check fantasy_teams
    const teamsCheck = await pool.query(`
      SELECT id, team_name, team_owner 
      FROM fantasy_teams 
      WHERE league_id = 84
    `);
    console.log('\n2. Fantasy teams in League 84:');
    console.table(teamsCheck.rows);

    // Check if teams have Playing XI
    const playingXiCheck = await pool.query(`
      SELECT 
        ft.id as team_id,
        ft.team_name,
        COUNT(DISTINCT tpxi.match_id) as matches_with_playing_xi,
        COUNT(tpxi.player_id) as total_players_selected
      FROM fantasy_teams ft
      LEFT JOIN team_playing_xi tpxi ON ft.id = tpxi.team_id
      WHERE ft.league_id = 84
      GROUP BY ft.id, ft.team_name
    `);
    console.log('\n3. Playing XI status per team:');
    console.table(playingXiCheck.rows);

    // Check league_matches
    const matchesCheck = await pool.query(`
      SELECT 
        id,
        match_id,
        match_description,
        is_completed
      FROM league_matches 
      WHERE league_id = 84
      ORDER BY id
    `);
    console.log('\n4. League matches:');
    console.table(matchesCheck.rows);

    // Try to query the leaderboard view
    const leaderboardCheck = await pool.query(`
      SELECT * FROM league_leaderboard 
      WHERE league_id = 84
    `);
    console.log('\n5. Leaderboard view results:', leaderboardCheck.rows.length, 'teams');
    if (leaderboardCheck.rows.length > 0) {
      console.table(leaderboardCheck.rows);
    }

    pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    pool.end();
  }
}

checkLeaderboard();
