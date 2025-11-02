import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'Fantasy',
  user: 'postgres',
  password: 'P@rvezn00r'
});

async function quickReset() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete all Playing XI after Match 844 (keep baseline at 844)
    await client.query(`DELETE FROM team_playing_xi WHERE team_id = 103 AND match_id > 844`);
    
    // Reset counter
    await client.query(`UPDATE fantasy_teams SET captain_changes_made = 0, transfers_made = 0 WHERE id = 103`);
    
    await client.query('COMMIT');
    
    console.log('✅ Reset complete!');
    console.log('   Baseline: Match 844');
    console.log('   Captain changes: 0');
    console.log('   Deleted matches: 845+');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

quickReset();
