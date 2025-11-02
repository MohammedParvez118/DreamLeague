import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Fantasy',
  password: 'P@rvezn00r',
  port: 5432
});

async function updateTournamentDates() {
  try {
    // Set CSA T20 Challenge as completed (5 days ago)
    const pastDate = Date.now() - (5 * 24 * 60 * 60 * 1000);
    await pool.query('UPDATE tournaments SET end_date = $1 WHERE series_id = 11032', [pastDate]);
    
    // Set IPL as ongoing (ends in 30 days)
    const futureDate = Date.now() + (30 * 24 * 60 * 60 * 1000);
    await pool.query('UPDATE tournaments SET end_date = $1 WHERE series_id = 9237', [futureDate]);
    
    // Display updated tournaments
    const result = await pool.query('SELECT series_id, name, end_date FROM tournaments WHERE series_id IN (11032, 9237)');
    
    console.log('✅ Updated tournaments:');
    result.rows.forEach(row => {
      const endDate = new Date(parseInt(row.end_date));
      const status = Date.now() > parseInt(row.end_date) ? 'COMPLETED' : 'ONGOING';
      console.log(`  • ${row.name}`);
      console.log(`    End Date: ${endDate.toLocaleDateString()}`);
      console.log(`    Status: ${status}\n`);
    });
    
    pool.end();
  } catch (error) {
    console.error('Error:', error);
    pool.end();
  }
}

updateTournamentDates();
