import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'Fantasy',
  user: 'postgres',
  password: 'P@rvezn00r'
});

async function checkHistory() {
  const client = await pool.connect();
  
  try {
    // Get Mohammed's Team captain history
    const query = `
      SELECT 
        tpxi.match_id,
        tpxi.player_id,
        tpxi.is_captain,
        tpxi.is_vice_captain,
        tpxi.created_at
      FROM team_playing_xi tpxi
      WHERE tpxi.team_id = 103 
        AND (tpxi.is_captain = true OR tpxi.is_vice_captain = true)
      ORDER BY tpxi.match_id
    `;
    
    const result = await client.query(query);
    
    console.log('\n📜 Captain/VC History for Mohammed\'s Team (ID: 103):\n');
    
    let lastCaptain = null;
    
    result.rows.forEach(row => {
      if (row.is_captain) {
        const changed = lastCaptain && lastCaptain !== row.player_id;
        console.log(`Match ${row.match_id}: Captain = ${row.player_id} ${changed ? '🔄 CHANGED!' : ''}`);
        lastCaptain = row.player_id;
      }
      if (row.is_vice_captain) {
        console.log(`Match ${row.match_id}: VC = ${row.player_id}`);
      }
    });
    
    // Get current captain_changes_made
    const statsQuery = `SELECT captain_changes_made FROM fantasy_teams WHERE id = 103`;
    const stats = await client.query(statsQuery);
    
    console.log(`\n📊 Current captain_changes_made: ${stats.rows[0].captain_changes_made}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkHistory();
