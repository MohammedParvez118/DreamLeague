import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Fantasy',
  password: 'P@rvezn00r',
  port: 5432,
});

async function checkTeam106PlayingXI() {
  try {
    console.log('\n=== Checking Team 106 Playing XI Status ===\n');

    // Get team info
    const teamInfo = await pool.query(`
      SELECT id, team_name, team_owner, league_id
      FROM fantasy_teams
      WHERE id = 106
    `);
    
    console.log('Team Info:');
    console.table(teamInfo.rows);

    // Get all matches for this team's league
    const matchesWithXI = await pool.query(`
      SELECT 
        lm.id as match_id,
        lm.match_description,
        lm.match_start,
        lm.match_start <= NOW() as is_locked,
        COUNT(tpxi.id) as players_saved,
        MAX(tpxi.created_at) as saved_at
      FROM league_matches lm
      LEFT JOIN team_playing_xi tpxi ON tpxi.match_id = lm.id AND tpxi.team_id = 106
      WHERE lm.league_id = 84
      GROUP BY lm.id, lm.match_description, lm.match_start
      ORDER BY lm.id
      LIMIT 15
    `);

    console.log('\nPlaying XI Status for Team 106 (testuser1\'s Team):');
    console.table(matchesWithXI.rows);

    // Show some player details for first few matches
    const playersDetail = await pool.query(`
      SELECT 
        lm.match_description,
        tpxi.player_name,
        tpxi.player_role,
        tpxi.is_captain,
        tpxi.is_vice_captain,
        tpxi.created_at
      FROM team_playing_xi tpxi
      JOIN league_matches lm ON tpxi.match_id = lm.id
      WHERE tpxi.team_id = 106
      AND lm.id IN (876, 877, 878, 879, 880)
      ORDER BY lm.id, tpxi.id
    `);

    console.log('\nPlayer Details for First 5 Matches:');
    console.table(playersDetail.rows);

    pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    pool.end();
  }
}

checkTeam106PlayingXI();
