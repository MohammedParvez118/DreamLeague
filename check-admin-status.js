import pool from './src/config/database.js';

async function checkAdminStatus() {
  try {
    console.log('=== Checking Admin Status for League 84 ===\n');
    
    // Check all teams in league 84
    const teamsResult = await pool.query(
      `SELECT id, team_name, team_owner, is_admin, league_id
       FROM fantasy_teams
       WHERE league_id = 84
       ORDER BY id`,
    );
    
    console.log('Teams in League 84:');
    console.table(teamsResult.rows);
    
    // Check league creator
    const leagueResult = await pool.query(
      `SELECT id, league_name, created_by
       FROM fantasy_leagues
       WHERE id = 84`,
    );
    
    console.log('\nLeague 84 Info:');
    console.table(leagueResult.rows);
    
    // Check if admin check query works
    console.log('\n=== Testing Admin Check Query ===');
    const testEmails = [
      ...new Set(teamsResult.rows.map(t => t.team_owner))
    ];
    
    for (const email of testEmails) {
      const adminCheck = await pool.query(
        `SELECT ft.id, ft.team_name, ft.is_admin 
         FROM fantasy_teams ft
         WHERE ft.league_id = $1 AND ft.team_owner = $2 AND ft.is_admin = TRUE`,
        [84, email]
      );
      
      console.log(`\nEmail: ${email}`);
      console.log(`Admin Check Result:`, adminCheck.rows.length > 0 ? '✅ IS ADMIN' : '❌ NOT ADMIN');
      if (adminCheck.rows.length > 0) {
        console.table(adminCheck.rows);
      }
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkAdminStatus();
