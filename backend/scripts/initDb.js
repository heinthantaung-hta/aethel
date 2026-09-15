import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new pg.Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT, 10),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: process.env.PGHOST === 'localhost' ? false : { rejectUnauthorized: false },
});

async function initDatabase() {
  const sqlPath = path.resolve(__dirname, '..', 'src', 'db', 'init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('🔧 Connecting to PostgreSQL...');
  const client = await pool.connect();

  try {
    console.log('📦 Running DDL initialization script...');
    await client.query(sql);
    console.log('✅ Database initialized successfully.');

    // Verify tables
    const res = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('📋 Tables created:', res.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase();
