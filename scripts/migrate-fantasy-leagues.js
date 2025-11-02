// Database migration script to update fantasy_leagues table
import { db } from '../src/config/database.js';

async function migrateDatabase() {
  try {
    console.log('Starting database migration...\n');
    
    // Step 1: Add new columns
    console.log('Step 1: Adding new columns...');
    
    await db.query(`
      ALTER TABLE fantasy_leagues
      ADD COLUMN IF NOT EXISTS privacy VARCHAR(10) DEFAULT 'public',
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS tournament_id INTEGER,
      ADD COLUMN IF NOT EXISTS league_code VARCHAR(20) UNIQUE
    `);
    console.log('✅ New columns added');
    
    // Step 2: Drop old columns
    console.log('\nStep 2: Dropping old columns...');
    
    await db.query(`
      ALTER TABLE fantasy_leagues
      DROP COLUMN IF EXISTS selection_mode,
      DROP COLUMN IF EXISTS point_system,
      DROP COLUMN IF EXISTS teams_added
    `);
    console.log('✅ Old columns removed');
    
    // Step 3: Add foreign key constraint for tournament_id
    console.log('\nStep 3: Adding foreign key constraint...');
    
    await db.query(`
      ALTER TABLE fantasy_leagues
      ADD CONSTRAINT fk_tournament
      FOREIGN KEY (tournament_id) 
      REFERENCES tournaments(series_id)
      ON DELETE SET NULL
    `);
    console.log('✅ Foreign key constraint added');
    
    // Step 4: Verify the new structure
    console.log('\nStep 4: Verifying new structure...');
    
    const result = await db.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'fantasy_leagues' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nNew table structure:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''})`);
    });
    
    console.log('\n✅ Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

migrateDatabase();
