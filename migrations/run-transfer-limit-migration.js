// migrations/run-transfer-limit-migration.js
// Run this script to apply the new transfer limit schema

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const { Pool } = pg;

// Load environment variables
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting transfer limit migration...\n');
    
    // Read the SQL migration file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const sqlPath = join(__dirname, 'add_transfer_limit_and_free_changes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await client.query('BEGIN');
    
    console.log('1️⃣ Adding transfer_limit column to fantasy_leagues...');
    await client.query(`
      ALTER TABLE fantasy_leagues 
      ADD COLUMN IF NOT EXISTS transfer_limit INTEGER DEFAULT 10;
    `);
    console.log('   ✅ Done\n');
    
    console.log('2️⃣ Removing old tracking columns from fantasy_teams...');
    await client.query(`
      ALTER TABLE fantasy_teams 
      DROP COLUMN IF EXISTS transfers_made_from_baseline,
      DROP COLUMN IF EXISTS captain_changes_made;
    `);
    console.log('   ✅ Done\n');
    
    console.log('3️⃣ Adding new free change tracking columns...');
    await client.query(`
      ALTER TABLE fantasy_teams 
      ADD COLUMN IF NOT EXISTS captain_free_change_used BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS vice_captain_free_change_used BOOLEAN DEFAULT FALSE;
    `);
    console.log('   ✅ Done\n');
    
    console.log('4️⃣ Creating indexes for performance...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_team_playing_xi_team_match 
      ON team_playing_xi(team_id, match_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_league_matches_start_time 
      ON league_matches(league_id, match_start);
    `);
    console.log('   ✅ Done\n');
    
    console.log('5️⃣ Setting default transfer limit for existing fantasy_leagues...');
    const result = await client.query(`
      UPDATE fantasy_leagues 
      SET transfer_limit = 10 
      WHERE transfer_limit IS NULL;
    `);
    console.log(`   ✅ Updated ${result.rowCount} leagues\n`);
    
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   - Added: fantasy_leagues.transfer_limit');
    console.log('   - Added: fantasy_teams.captain_free_change_used');
    console.log('   - Added: fantasy_teams.vice_captain_free_change_used');
    console.log('   - Removed: fantasy_teams.transfers_made_from_baseline');
    console.log('   - Removed: fantasy_teams.captain_changes_made');
    console.log('   - Created: Performance indexes');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n🎉 All done! You can now use the new transfer system.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration error:', error);
    process.exit(1);
  });
