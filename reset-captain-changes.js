// Reset captain_changes_made for testing
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Fantasy',
  password: 'P@rvezn00r',
  port: 5432,
});

async function resetCaptainChanges() {
  try {
    console.log('🔄 Resetting captain_changes_made to 0 for all teams...');
    
    const result = await pool.query(
      'UPDATE fantasy_teams SET captain_changes_made = 0'
    );
    
    console.log(`✅ Reset ${result.rowCount} teams`);
    
    // Show current state
    const teams = await pool.query(
      `SELECT ft.id, ft.team_name, ft.captain_changes_made, fl.league_name
       FROM fantasy_teams ft
       JOIN fantasy_leagues fl ON ft.league_id = fl.id
       ORDER BY ft.id`
    );
    
    console.log('\n📊 Current state:');
    teams.rows.forEach(team => {
      console.log(`Team: ${team.team_name} (League: ${team.league_name}) - C/VC changes: ${team.captain_changes_made}`);
    });
    
    await pool.end();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetCaptainChanges();
