import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function checkSchema() {
  try {
    const players = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'players' ORDER BY ordinal_position");
    const squads = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'squads' ORDER BY ordinal_position");
    const matches = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'matches' ORDER BY ordinal_position");
    
    console.log('Players columns:', players.rows.map(x => x.column_name).join(', '));
    console.log('Squads columns:', squads.rows.map(x => x.column_name).join(', '));
    console.log('Matches columns:', matches.rows.map(x => x.column_name).join(', '));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
