import db from './src/config/database.js';

const query = `
  SELECT s.squad_type, sp.name, sp.role, sp.batting_style, sp.bowling_style
  FROM squads s 
  JOIN squad_players sp ON s.squad_id = sp.squad_id 
  WHERE s.series_id = 10884 
  LIMIT 15;
`;

db.query(query)
  .then((result) => {
    console.log('\n=== Sample Player Data ===\n');
    console.table(result.rows);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
