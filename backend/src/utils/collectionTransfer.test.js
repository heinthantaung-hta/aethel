import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';
import router from '../routes/collectionTransfer.js';

const importHandler = router.stack.find(layer => layer.route?.path === '/import').route.stack.at(-1).handle;
const movie = { title: 'Arrival', release_year: 2016, rating: 5, completion_status: 'Completed',
  tmdb_id: 329865, genres: ['Sci-Fi'] };

async function runImport(items, { failInsert = false } = {}) {
  const queries = [];
  let result;
  let error;
  let released = false;
  const inserted = new Set();
  const client = { release: () => { released = true; }, query: async (sql, values) => {
    queries.push({ sql, values });
    if (sql.includes('SELECT type_id')) return { rows: [{ type_id: 1 }] };
    if (sql.includes('SELECT genre_id')) return { rows: [{ genre_id: 8, genre_name: 'Sci-Fi' }] };
    if (sql.includes('SELECT item_id, title')) {
      assert.equal(values[0], 42);
      return { rows: inserted.has(values[2]) ? [{ item_id: 1 }] : [] };
    }
    if (sql.includes('INSERT INTO media_items')) {
      if (failInsert) throw new Error('Connection interrupted');
      assert.equal(values[8], 42); // Always the authenticated user's collection.
      inserted.add(values[0]);
      return { rows: [{ item_id: inserted.size }] };
    }
    return { rows: [] };
  } };
  const original = pool.connect;
  pool.connect = async () => client;
  try {
    await importHandler({ user: { user_id: 42 }, body: { format: 'aethel-collection', version: 1, items } },
      { json: data => { result = data; } }, err => { error = err; });
  } finally { pool.connect = original; }
  return { queries, result, error, released };
}

test('restore skips duplicates in the same file and commits valid movies to the current user', async () => {
  const outcome = await runImport([movie, { ...movie, user_id: 999 }]);
  assert.deepEqual(outcome.result, { imported: 1, skipped: 1 });
  assert.equal(outcome.error, undefined);
  assert.ok(outcome.queries.some(q => q.sql === 'COMMIT'));
  assert.ok(outcome.released);
});

test('unknown genre rolls back before any movie is inserted', async () => {
  const outcome = await runImport([movie, { ...movie, genres: ['Unknown genre'] }]);
  assert.match(outcome.error.message, /Unknown genre/);
  assert.equal(outcome.queries.some(q => q.sql.includes('INSERT INTO media_items')), false);
  assert.ok(outcome.queries.some(q => q.sql === 'ROLLBACK'));
  assert.ok(outcome.released);
});

test('database failure rolls back and reports an error rather than partial success', async () => {
  const outcome = await runImport([movie], { failInsert: true });
  assert.equal(outcome.result, undefined);
  assert.match(outcome.error.message, /Connection interrupted/);
  assert.ok(outcome.queries.some(q => q.sql === 'ROLLBACK'));
  assert.equal(outcome.queries.some(q => q.sql === 'COMMIT'), false);
  assert.ok(outcome.released);
});

test('malformed file fails validation before connecting to the database', async () => {
  const outcome = await runImport([{ ...movie, rating: 7 }]);
  assert.equal(outcome.error.type, 'validation');
  assert.deepEqual(outcome.queries, []);
});
