import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import pool from '../src/config/db.js';
import { applyMigrations } from '../src/utils/migrations.js';
import { backupDatabase } from './backup.js';

let client;
try {
  const directory = new URL('../src/db/migrations/', import.meta.url);
  const files = (await readdir(directory)).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
  const migrations = await Promise.all(files.map(async version => ({ version, sql: await readFile(new URL(version, directory), 'utf8') })));
  client = await pool.connect();
  const applied = await applyMigrations(client, migrations, async () => {
    console.log(`Pre-migration backup saved: ${await backupDatabase()}`);
  });
  console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database is up to date.');
} catch (err) {
  console.error(err.code === '23505'
    ? 'Existing duplicate movies prevent migration. No records were removed. Review duplicates per user, then run db:migrate again.'
    : `Migration failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
