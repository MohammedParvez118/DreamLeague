// Run Squad Replacement Migration
// Date: November 1, 2025

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'Fantasy',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'P@rvezn00r'
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Squad Replacement System migration...\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'add_squad_replacements.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await client.query(migrationSQL);
    
    console.log('\n✅ Migration completed successfully!\n');
    
    // Verify tables
    console.log('📊 Verifying new structures...\n');
    
    const checks = [
      {
        name: 'squad_replacements table',
        query: "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'squad_replacements'"
      },
      {
        name: 'fantasy_squads.is_injured column',
        query: "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'fantasy_squads' AND column_name = 'is_injured'"
      },
      {
        name: 'fantasy_teams.is_admin column',
        query: "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'fantasy_teams' AND column_name = 'is_admin'"
      },
      {
        name: 'admin_pending_replacements view',
        query: "SELECT COUNT(*) FROM information_schema.views WHERE table_name = 'admin_pending_replacements'"
      },
      {
        name: 'apply_replacement_to_future_matches function',
        query: "SELECT COUNT(*) FROM pg_proc WHERE proname = 'apply_replacement_to_future_matches'"
      }
    ];
    
    for (const check of checks) {
      const result = await client.query(check.query);
      const exists = parseInt(result.rows[0].count) > 0;
      console.log(`${exists ? '✅' : '❌'} ${check.name}: ${exists ? 'Created' : 'Not Found'}`);
    }
    
    // Check how many admins were set
    const adminCount = await client.query(
      'SELECT COUNT(*) as count FROM fantasy_teams WHERE is_admin = TRUE'
    );
    console.log(`\n👥 League creators set as admins: ${adminCount.rows[0].count}`);
    
    console.log('\n🎉 Squad Replacement System is ready to use!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\nError details:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
