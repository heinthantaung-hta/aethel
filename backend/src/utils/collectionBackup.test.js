import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBackup, makeBackup, findDuplicate } from './collectionBackup.js';

const movie = { title: 'Arrival', release_year: 2016, rating: 5, completion_status: 'Completed',
  tmdb_id: 329865, poster_url: 'https://example.com/poster.jpg', overview: 'A first encounter.',
  date_logged: '2026-01-01T00:00:00.000Z', genres: [{ genre_name: 'Sci-Fi' }] };

test('backup round trip preserves library data and excludes account and database IDs', () => {
  const backup = makeBackup([{ ...movie, user_id: 18, item_id: 22, password: 'private' }]);
  assert.equal(JSON.stringify(backup).includes('private'), false);
  assert.equal(backup.items[0].user_id, undefined);
  assert.equal(backup.items[0].item_id, undefined);
  const [restored] = parseBackup(backup);
  assert.equal(restored.rating, 5);
  assert.equal(restored.date_logged, movie.date_logged);
  assert.deepEqual(restored.genres, ['Sci-Fi']);
  assert.equal(restored.tmdb_id, movie.tmdb_id);
});

test('rejects invalid files and unsupported versions', () => {
  for (const data of [null, [], {}, { format: 'aethel-collection', version: 2, items: [] }]) assert.throws(() => parseBackup(data));
  assert.deepEqual(parseBackup(makeBackup([])), []);
});

test('invalid rows reject the entire backup with an actionable row number', () => {
  const invalid = [{ rating: 6 }, { genres: [''] }, { title: 'x'.repeat(256) }, { tmdb_id: -1 },
    { poster_url: 'javascript:alert(1)' }, { date_logged: 'not-a-date' }, { overview: {} }, { release_year: 12 }];
  for (const patch of invalid) {
    const backup = makeBackup([movie, movie]);
    Object.assign(backup.items[1], patch);
    assert.throws(() => parseBackup(backup), /Movie 2:/);
  }
  const backup = makeBackup([movie]);
  backup.items = Array(1001).fill(backup.items[0]);
  assert.throws(() => parseBackup(backup), /1,000/);
});

test('imports normalize unwatched ratings and ignore caller-supplied ownership', () => {
  const backup = makeBackup([movie]);
  Object.assign(backup.items[0], { user_id: 999, completion_status: 'Watching' });
  const [item] = parseBackup(backup);
  assert.equal(item.user_id, undefined);
  assert.equal(item.rating, null);
});

test('duplicate lookup scopes to the user and excludes the movie being edited', async () => {
  let params;
  const client = { query: async (_sql, values) => { params = values; return { rows: [{ item_id: 7 }] }; } };
  assert.equal((await findDuplicate(client, 2, movie, 4)).item_id, 7);
  assert.deepEqual(params, [2, movie.tmdb_id, 'Arrival', 2016, 4]);
});
