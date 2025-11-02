import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Fantasy',
  password: 'P@rvezn00r',
  port: 5432,
});

async function checkData() {
  try {
    console.log('\n=== Checking Top Performers Data Sources ===\n');

    // Check player stats tables
    const battingCheck = await pool.query(`SELECT COUNT(*) as count FROM player_batting_stats`);
    console.log('1. player_batting_stats records:', battingCheck.rows[0].count);

    const bowlingCheck = await pool.query(`SELECT COUNT(*) as count FROM player_bowling_stats`);
    console.log('2. player_bowling_stats records:', bowlingCheck.rows[0].count);

    const fieldingCheck = await pool.query(`SELECT COUNT(*) as count FROM player_fielding_stats`);
    console.log('3. player_fielding_stats records:', fieldingCheck.rows[0].count);

    // Check team_playing_xi for league 84
    const playingXiCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM team_playing_xi tpxi
      JOIN league_matches lm ON tpxi.match_id = lm.id
      WHERE lm.league_id = 84
    `);
    console.log('\n4. team_playing_xi records for League 84:', playingXiCheck.rows[0].count);

    // Check league_matches for league 84
    const matchesCheck = await pool.query(`
      SELECT id, match_id, match_description, is_completed
      FROM league_matches 
      WHERE league_id = 84
      ORDER BY id
      LIMIT 5
    `);
    console.log('\n5. league_matches for League 84:');
    console.log(matchesCheck.rows);

    // Try to manually calculate points for one player
    const manualCalc = await pool.query(`
      SELECT 
        tpxi.player_id,
        tpxi.player_name,
        lm.match_id,
        lm.is_completed,
        pbs.runs_scored,
        pbs.fours,
        pbs.sixes,
        pbows.wickets,
        pfs.catches
      FROM team_playing_xi tpxi
      JOIN league_matches lm ON tpxi.match_id = lm.id
      LEFT JOIN player_batting_stats pbs ON tpxi.player_id::text = pbs.player_id::text AND lm.match_id = pbs.match_id
      LEFT JOIN player_bowling_stats pbows ON tpxi.player_id::text = pbows.player_id::text AND lm.match_id = pbows.match_id
      LEFT JOIN player_fielding_stats pfs ON tpxi.player_id::text = pfs.player_id::text AND lm.match_id = pfs.match_id
      WHERE lm.league_id = 84
      LIMIT 5
    `);
    console.log('\n6. Manual join with stats tables:');
    console.log(manualCalc.rows);

    // Check completed matches
    const completedMatches = await pool.query(`
      SELECT COUNT(*) as count 
      FROM league_matches 
      WHERE league_id = 84 AND is_completed = TRUE
    `);
    console.log('\n7. Completed matches for League 84:', completedMatches.rows[0].count);

    pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    pool.end();
  }
}

checkData();
