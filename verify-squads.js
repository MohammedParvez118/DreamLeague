import db from './src/config/database.js';

const query = `
  SELECT s.squad_type, COUNT(sp.player_id) as player_count 
  FROM squads s 
  LEFT JOIN squad_players sp ON s.squad_id = sp.squad_id 
  WHERE s.series_id = 10884 
  GROUP BY s.squad_id, s.squad_type 
  ORDER BY s.squad_type;
`;

db.query(query)
  .then((result) => {
    console.log('\n=== Squad Data Verification ===\n');
    console.table(result.rows);
    console.log(`\nTotal: ${result.rows.length} squads`);
    const totalPlayers = result.rows.reduce((sum, row) => sum + parseInt(row.player_count), 0);
    console.log(`Total players: ${totalPlayers}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
