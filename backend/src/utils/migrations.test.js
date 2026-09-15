import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMigrations, migrationChecksum } from './migrations.js';

const migrations = [{ version: '001.sql', sql: 'ALTER TABLE media_items ALTER COLUMN rating DROP NOT NULL' }];
function clientFor(applied = [], failSql = null) {
  const queries = [];
  return { queries, query: async (sql, params) => {
    queries.push({ sql, params });
    if (sql === failSql) throw new Error('migration failed');
    if (sql.includes('to_regclass')) return { rows: [{ name: applied.length ? 'schema_migrations' : null }] };
    if (sql.startsWith('SELECT version')) return { rows: applied };
    return { rows: [] };
  } };
}

test('migration backs up before opening a transaction and records checksums', async () => {
  const client = clientFor();
  const applied = await applyMigrations(client, migrations, async () => {
    assert.equal(client.queries.some(q => q.sql === 'BEGIN'), false);
    client.queries.push({ sql: 'BACKUP' });
  });
  assert.deepEqual(applied, ['001.sql']);
  const history = client.queries.find(q => q.sql.startsWith('INSERT INTO schema_migrations'));
  assert.deepEqual(history.params, ['001.sql', migrationChecksum(migrations[0].sql)]);
  assert.ok(client.queries.some(q => q.sql === 'COMMIT'));
});

test('failed backup never starts a migration', async () => {
  const client = clientFor();
  await assert.rejects(applyMigrations(client, migrations, async () => { throw new Error('backup failed'); }), /backup failed/);
  assert.equal(client.queries.some(q => q.sql === 'BEGIN'), false);
  assert.ok(client.queries.at(-1).sql.includes('pg_advisory_unlock'));
});

test('failed SQL rolls back the whole migration batch', async () => {
  const client = clientFor([], migrations[0].sql);
  await assert.rejects(applyMigrations(client, migrations, async () => {}), /migration failed/);
  assert.ok(client.queries.some(q => q.sql === 'ROLLBACK'));
  assert.equal(client.queries.some(q => q.sql === 'COMMIT'), false);
});

test('already-applied migrations do not run or create another backup', async () => {
  const client = clientFor([{ version: '001.sql', checksum: migrationChecksum(migrations[0].sql) }]);
  assert.deepEqual(await applyMigrations(client, migrations, () => { throw new Error('Should not back up'); }), []);
});

test('edited migration history is rejected before backup or schema changes', async () => {
  await assert.rejects(applyMigrations(clientFor([{ version: '001.sql', checksum: 'changed' }]), migrations, () => {}), /changed or is missing/);
});
