import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Fantasy',
  password: 'P@rvezn00r',
  port: 5432,
});

async function checkPlayerIdTypes() {
  try {
    console.log('\n=== Checking fantasy_squads player_id types ===');
    const squad = await pool.query(`SELECT player_id, player_name FROM fantasy_squads WHERE league_id = 83 LIMIT 5`);
    console.log('\nfantasy_squads sample:');
    squad.rows.forEach(r => console.log('  player_id:', r.player_id, '(type:', typeof r.player_id, ')'));
    
    console.log('\n=== Checking squad_players player_id types ===');
    const players = await pool.query(`SELECT player_id, name FROM squad_players LIMIT 5`);
    console.log('\nsquad_players sample:');
    players.rows.forEach(r => console.log('  player_id:', r.player_id, '(type:', typeof r.player_id, ')'));
    
    console.log('\n=== Testing specific player validation ===');
    const testPlayerId = 'Abdul Manan Ali'; // One of the "invalid" players from error
    
    const inFantasySquad = await pool.query(
      `SELECT player_id, player_name FROM fantasy_squads WHERE league_id = 83 AND team_id = 103 AND player_name = $1`,
      [testPlayerId]
    );
    console.log(`\n"${testPlayerId}" in fantasy_squads:`, inFantasySquad.rows);
    
    const inSquadPlayers = await pool.query(
      `SELECT player_id, name FROM squad_players WHERE name = $1`,
      [testPlayerId]
    );
    console.log(`"${testPlayerId}" in squad_players:`, inSquadPlayers.rows);
    
    console.log('\n=== Checking all fantasy_squads for team 103 ===');
    const allSquad = await pool.query(
      `SELECT player_id, player_name FROM fantasy_squads WHERE league_id = 83 AND team_id = 103`
    );
    console.log(`\nTotal players in squad: ${allSquad.rows.length}`);
    console.log('Sample player_ids:');
    allSquad.rows.slice(0, 10).forEach(r => console.log('  ', r.player_id, '-', r.player_name));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkPlayerIdTypes();
