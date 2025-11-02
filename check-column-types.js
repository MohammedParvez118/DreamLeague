import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Fantasy',
  password: 'P@rvezn00r',
  port: 5432,
});

async function checkColumnTypes() {
  try {
    console.log('Checking column types...\n');

    // Check fantasy_squads
    const fsColumns = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'fantasy_squads' 
      AND column_name IN ('player_id', 'player_name', 'squad_name')
      ORDER BY ordinal_position
    `);

    console.log('📋 fantasy_squads columns:');
    console.table(fsColumns.rows);

    // Check squad_players
    const spColumns = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'squad_players' 
      AND column_name IN ('player_id', 'name')
      ORDER BY ordinal_position
    `);

    console.log('\n📋 squad_players columns:');
    console.table(spColumns.rows);

    // Test the query
    console.log('\n🧪 Testing query for league 83, team 103...');
    const testQuery = await pool.query(`
      SELECT 
        fs.id,
        fs.player_id,
        fs.player_name,
        fs.squad_name,
        fs.role,
        sp.role as player_role
      FROM fantasy_squads fs
      LEFT JOIN squad_players sp ON sp.player_id = CAST(fs.player_id AS BIGINT)
      WHERE fs.league_id = $1 AND fs.team_id = $2
      LIMIT 5
    `, [83, 103]);

    console.log('✅ Query results:');
    console.table(testQuery.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkColumnTypes();
