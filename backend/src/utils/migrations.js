import { createHash } from 'node:crypto';

export function migrationChecksum(sql) {
  return createHash('sha256').update(sql).digest('hex');
}

// A failed migration rolls back the entire batch, including its history entries.
export async function applyMigrations(client, migrations, backup) {
  await client.query('SELECT pg_advisory_lock(73143)');
  try {
    const table = await client.query("SELECT to_regclass('public.schema_migrations') AS name");
    const applied = table.rows[0].name
      ? (await client.query('SELECT version, checksum FROM schema_migrations')).rows : [];
    for (const previous of applied) {
      const migration = migrations.find(m => m.version === previous.version);
      if (!migration || migrationChecksum(migration.sql) !== previous.checksum) {
        throw new Error(`Applied migration ${previous.version} has changed or is missing. Restore the original file.`);
      }
    }
    const pending = migrations.filter(m => !applied.some(a => a.version === m.version));
    if (!pending.length) return [];
    await backup(); // Never change the schema unless the backup succeeded.
    await client.query('BEGIN');
    try {
      await client.query("SET LOCAL lock_timeout = '10s'");
      await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
      for (const migration of pending) {
        await client.query(migration.sql);
        await client.query('INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
          [migration.version, migrationChecksum(migration.sql)]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
    return pending.map(m => m.version);
  } finally { await client.query('SELECT pg_advisory_unlock(73143)'); }
}
