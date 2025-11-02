import pool from './src/config/database.js';

async function checkAllLeagues() {
  try {
    console.log('=== Checking All Leagues for Admin Flags ===\n');
    
    // Check all leagues and their creators
    const result = await pool.query(`
      SELECT 
        fl.id as league_id,
        fl.league_name,
        fl.created_by as league_creator,
        ft.id as team_id,
        ft.team_name,
        ft.team_owner,
        ft.is_admin
      FROM fantasy_leagues fl
      LEFT JOIN fantasy_teams ft ON ft.league_id = fl.id AND ft.team_owner = fl.created_by
      ORDER BY fl.id
    `);
    
    console.log(`Found ${result.rows.length} leagues\n`);
    
    // Group by league
    const leagueMap = {};
    result.rows.forEach(row => {
      if (!leagueMap[row.league_id]) {
        leagueMap[row.league_id] = row;
      }
    });
    
    // Check which leagues have proper admin setup
    const leagues = Object.values(leagueMap);
    const noAdmin = leagues.filter(l => !l.is_admin);
    const hasAdmin = leagues.filter(l => l.is_admin);
    
    console.log(`✅ Leagues with admin flag set: ${hasAdmin.length}`);
    console.log(`❌ Leagues missing admin flag: ${noAdmin.length}\n`);
    
    if (noAdmin.length > 0) {
      console.log('Leagues needing fix:');
      console.table(noAdmin.map(l => ({
        league_id: l.league_id,
        league_name: l.league_name,
        creator: l.league_creator,
        team_id: l.team_id,
        is_admin: l.is_admin
      })));
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkAllLeagues();
