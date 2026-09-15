import test from 'node:test';
import assert from 'node:assert/strict';
import { filterCollection, collectionStats } from './collection.js';

const items = [
  { item_id: 1, title: 'Arrival', completion_status: 'Completed', rating: 5, release_year: 2016, date_logged: '2026-01-01', genres: [{ genre_name: 'Sci-Fi' }] },
  { item_id: 2, title: 'Dune', completion_status: 'Watching', rating: null, release_year: 2021, date_logged: '2026-03-01', genres: [{ genre_name: 'Sci-Fi' }] },
  { item_id: 3, title: 'Amélie', completion_status: 'Want to Watch', rating: null, release_year: 2001, date_logged: '2026-02-01', genres: [{ genre_name: 'Romance' }] },
];
const ids = values => values.map(item => item.item_id);

test('combines title, status and genre filters, ignoring search case and surrounding spaces', () => {
  assert.deepEqual(ids(filterCollection(items, { search: ' ARR ', status: 'Completed', genre: 'Sci-Fi' })), [1]);
  assert.deepEqual(filterCollection(items, { status: 'Watching', genre: 'Romance' }), []);
});

test('sorts by date, title, rating and release year without changing the original collection', () => {
  assert.deepEqual(ids(filterCollection(items)), [2, 3, 1]);
  assert.deepEqual(ids(filterCollection(items, { sort: 'oldest' })), [1, 3, 2]);
  assert.deepEqual(ids(filterCollection(items, { sort: 'title' })), [3, 1, 2]);
  assert.deepEqual(ids(filterCollection(items, { sort: 'rating' })), [1, 3, 2]);
  assert.deepEqual(ids(filterCollection(items, { sort: 'year' })), [2, 1, 3]);
  assert.deepEqual(ids(items), [1, 2, 3]);
});

test('handles empty collections and missing optional metadata', () => {
  assert.deepEqual(filterCollection([]), []);
  const minimal = [{ item_id: 4, title: 'Unknown' }];
  assert.deepEqual(filterCollection(minimal, { genre: 'Drama' }), []);
  assert.deepEqual(filterCollection(minimal, { sort: 'rating' }), minimal);
  assert.deepEqual(collectionStats([]), { total: 0, completed: 0, in_progress: 0, backlog: 0 });
});

test('summary reflects status changes and deletions independently of visible filters', () => {
  assert.deepEqual(collectionStats(items), { total: 3, completed: 1, in_progress: 1, backlog: 1 });
  const updated = items.map(item => item.item_id === 2 ? { ...item, completion_status: 'Completed', rating: 4 } : item);
  assert.deepEqual(collectionStats(updated), { total: 3, completed: 2, in_progress: 0, backlog: 1 });
  assert.deepEqual(ids(filterCollection(updated, { status: 'Watching' })), []);
  assert.equal(collectionStats(updated.filter(item => item.item_id !== 1)).completed, 1);
});
