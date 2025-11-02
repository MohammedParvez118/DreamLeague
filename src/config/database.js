// database.js
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// If a full DATABASE_URL is provided (e.g. Render, Heroku, Railway), prefer it.
// Otherwise fall back to individual DB_* env vars or sensible defaults.
let pool;
if (process.env.DATABASE_URL) {
  // Many hosted Postgres providers require SSL. Enable it but allow self-signed certs
  // by setting `rejectUnauthorized: false`. If you control the DB certificate,
  // consider enabling strict verification.
  const useSsl = process.env.DB_SSL !== 'false';

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });
} else {
  // Database configuration using individual env vars
  const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'Fantasy',
    password: process.env.DB_PASSWORD || 'P@rvezn00r',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  };

  // Create connection pool
  pool = new Pool(dbConfig);
}

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export { pool as db };
export default pool;