import test from 'node:test';
import assert from 'node:assert/strict';
import { readBackup, backupParts, MAX_BACKUP_BYTES } from './backup.js';

const item = { title: 'Arrival', completion_status: 'Completed' };
const backup = { format: 'aethel-collection', version: 1, items: [item] };

test('valid backup preview and invalid file messages', () => {
  assert.deepEqual(readBackup(JSON.stringify(backup)), backup);
  assert.throws(() => readBackup('<html>error</html>'), /valid JSON/);
  assert.throws(() => readBackup('{}'), /Aethel/);
  assert.throws(() => readBackup(JSON.stringify({ ...backup, items: [null] })), /invalid movie/);
});

test('large collections are split into restorable files without losing movies', () => {
  const source = { ...backup, items: Array.from({ length: 1005 }, (_, i) => ({ ...item, title: `Movie ${i}` })) };
  const parts = backupParts(source);
  assert.deepEqual(parts.map(p => p.items.length), [1000, 5]);
  assert.deepEqual(parts.flatMap(p => p.items), source.items);
  parts.forEach(part => readBackup(JSON.stringify(part)));
});

test('large metadata respects file size limits, and an empty collection can be backed up', () => {
  const source = { ...backup, items: Array.from({ length: 400 }, () => ({ ...item, overview: 'a'.repeat(20000) })) };
  const parts = backupParts(source);
  assert.ok(parts.length > 1);
  assert.equal(parts.flatMap(p => p.items).length, 400);
  for (const part of parts) assert.ok(new Blob([JSON.stringify(part)]).size < MAX_BACKUP_BYTES);
  assert.deepEqual(backupParts({ ...backup, items: [] }), [{ ...backup, items: [] }]);
});
