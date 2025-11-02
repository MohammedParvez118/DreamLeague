import db from './src/config/database.js';
import fs from 'fs';

const migrationFile = './migrations/add_tournament_dates.sql';

console.log('Running migration:', migrationFile);

const sql = fs.readFileSync(migrationFile, 'utf8');

db.query(sql)
  .then(() => {
    console.log('✅ Migration completed successfully!');
    
    // Verify columns exist
    return db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tournaments' 
      AND column_name IN ('start_date', 'end_date')
      ORDER BY column_name;
    `);
  })
  .then((result) => {
    console.log('\nVerified columns in tournaments table:');
    console.table(result.rows);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  });
