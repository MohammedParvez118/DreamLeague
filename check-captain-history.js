import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'Fantasy',
  user: 'postgres',
  password: 'P@rvezn00r'
});

async function checkCaptainHistory() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Checking Captain Change History...\n');
    
    // Get team info
    const teamQuery = `
      SELECT ft.id, ft.team_name, ft.captain_changes_made, fl.league_name
      FROM fantasy_teams ft
      JOIN fantasy_leagues fl ON ft.league_id = fl.id
      ORDER BY ft.id
    `;
    const teams = await client.query(teamQuery);
    
    console.log(`📋 Found ${teams.rows.length} teams\n`);
    
    // For each team, show their playing XI history
    for (const team of teams.rows) {
      if (team.captain_changes_made > 0) {
        console.log(`\n🏏 Team: ${team.team_name} (ID: ${team.id})`);
        console.log(`   League: ${team.league_name}`);
        console.log(`   Captain Changes Used: ${team.captain_changes_made}`);
        
        // Get their playing XI history with captain info
        const historyQuery = `
          SELECT 
            tpxi.match_id,
            lm.match_start,
            tpxi.player_id,
            tpxi.is_captain,
            tpxi.is_vice_captain,
            tpxi.created_at
          FROM team_playing_xi tpxi
          JOIN league_matches lm ON tpxi.match_id = lm.id
          WHERE tpxi.team_id = $1 AND (tpxi.is_captain = true OR tpxi.is_vice_captain = true)
          ORDER BY tpxi.match_id, tpxi.created_at
        `;
        
        const history = await client.query(historyQuery, [team.id]);
        
        console.log(`\n   📜 Captain/VC History:`);
        let lastCaptain = null;
        let lastVC = null;
        
        for (const entry of history.rows) {
          const captainChanged = lastCaptain && lastCaptain !== entry.player_id && entry.is_captain;
          const vcChanged = lastVC && lastVC !== entry.player_id && entry.is_vice_captain;
          
          if (entry.is_captain) {
            console.log(`   Match ${entry.match_id}: Captain = ${entry.player_id} ${captainChanged ? '🔄 CHANGED!' : ''}`);
            lastCaptain = entry.player_id;
          }
          if (entry.is_vice_captain) {
            console.log(`   Match ${entry.match_id}: VC = ${entry.player_id} ${vcChanged ? '🔄 CHANGED!' : ''}`);
            lastVC = entry.player_id;
          }
        }
      }
    }
    
    console.log('\n✅ History check complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkCaptainHistory();
