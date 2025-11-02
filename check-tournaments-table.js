import db from './src/config/database.js';

db.query(`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'tournaments' 
  ORDER BY ordinal_position;
`)
  .then((result) => {
    console.log('\n=== Tournaments Table Structure ===\n');
    console.table(result.rows);
    
    // Now query actual data
    return db.query('SELECT * FROM tournaments WHERE series_id = 10884');
  })
  .then((result) => {
    console.log('\n=== Tournament Data ===\n');
    console.table(result.rows);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
