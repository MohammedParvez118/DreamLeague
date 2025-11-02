// Script to check fantasy_leagues table structure
import { db } from '../src/config/database.js';

async function checkTableStructure() {
  try {
    console.log('Checking fantasy_leagues table structure...\n');
    
    const result = await db.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'fantasy_leagues' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    console.log('\n✅ Table structure checked successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking table structure:', error.message);
    process.exit(1);
  }
}

checkTableStructure();
