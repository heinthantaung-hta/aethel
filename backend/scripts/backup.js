import 'dotenv/config';
import { spawn } from 'node:child_process';
import { mkdir, open, rename, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export async function backupDatabase() {
  const directory = fileURLToPath(new URL('../backups/', import.meta.url));
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const destination = path.join(directory, `aethel-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}.dump`);
  const partial = `${destination}.partial`;
  const file = await open(partial, 'wx', 0o600);
  try {
    await new Promise((resolve, reject) => {
      const child = spawn('pg_dump', ['--format=custom', '--no-owner', '--no-acl', '--no-password'],
        { env: process.env, stdio: ['ignore', file.fd, 'pipe'] });
      // Drain stderr, but do not print connection details or credentials.
      child.stderr.resume();
      child.once('error', () => reject(new Error('pg_dump could not start. Install PostgreSQL client tools and add them to PATH.')));
      child.once('close', code => code === 0 ? resolve() : reject(new Error('Database backup failed. Check connectivity and your pg_dump version; no migrations were applied.')));
    });
    await file.close();
    await rename(partial, destination);
    return destination;
  } catch (err) {
    await file.close().catch(() => {});
    await unlink(partial).catch(() => {});
    throw err;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(`Backup saved: ${await backupDatabase()}`); }
  catch (err) { console.error(err.message); process.exitCode = 1; }
}
