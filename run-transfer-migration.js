import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Fantasy',
  password: 'P@rvezn00r',
  port: 5432,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration: Add transfer limits...');
    
    await client.query('BEGIN');
    
    // Add columns to fantasy_leagues
    console.log('1. Adding columns to fantasy_leagues...');
    await client.query(`
      ALTER TABLE fantasy_leagues 
      ADD COLUMN IF NOT EXISTS max_transfers INTEGER DEFAULT 10,
      ADD COLUMN IF NOT EXISTS allow_captain_changes BOOLEAN DEFAULT TRUE
    `);
    
    // Add columns to fantasy_teams
    console.log('2. Adding columns to fantasy_teams...');
    await client.query(`
      ALTER TABLE fantasy_teams
      ADD COLUMN IF NOT EXISTS transfers_made INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS captain_changes_made INTEGER DEFAULT 0
    `);
    
    // Create playing_xi_transfers table
    console.log('3. Creating playing_xi_transfers table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS playing_xi_transfers (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL,
        league_id INTEGER NOT NULL,
        match_id INTEGER NOT NULL,
        transfer_type VARCHAR(20) NOT NULL,
        player_id VARCHAR(50),
        player_name VARCHAR(255),
        previous_player_id VARCHAR(50),
        previous_player_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_team FOREIGN KEY (team_id) REFERENCES fantasy_teams(id) ON DELETE CASCADE,
        CONSTRAINT fk_league FOREIGN KEY (league_id) REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
        CONSTRAINT fk_match FOREIGN KEY (match_id) REFERENCES league_matches(id) ON DELETE CASCADE
      )
    `);
    
    // Create indexes
    console.log('4. Creating indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transfers_team ON playing_xi_transfers(team_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transfers_league ON playing_xi_transfers(league_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transfers_match ON playing_xi_transfers(match_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transfers_type ON playing_xi_transfers(transfer_type)`);
    
    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!');
    
    // Verify
    const result = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'fantasy_leagues' 
      AND column_name IN ('max_transfers', 'allow_captain_changes')
    `);
    console.log('\nVerification - fantasy_leagues columns:');
    result.rows.forEach(r => console.log('  ', r.column_name, ':', r.data_type, 'default:', r.column_default));
    
    const result2 = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'fantasy_teams' 
      AND column_name IN ('transfers_made', 'captain_changes_made')
    `);
    console.log('\nVerification - fantasy_teams columns:');
    result2.rows.forEach(r => console.log('  ', r.column_name, ':', r.data_type, 'default:', r.column_default));
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
