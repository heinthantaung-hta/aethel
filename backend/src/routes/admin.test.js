import test from 'node:test';
import assert from 'node:assert/strict';
import router from './admin.js';
import pool from '../config/db.js';

async function callRoute(path, body, queryResult = { rows: [{ report_id: 3 }], rowCount: 1 }, userId = 1, targetId = '3') {
  const handler = router.stack.find(layer => layer.route?.path === path && layer.route.methods.patch).route.stack[0].handle;
  const calls = [];
  const original = pool.query;
  pool.query = async (...args) => { calls.push(args); return queryResult; };
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
  try {
    await handler({ body, params: { id: targetId }, user: { user_id: userId } }, res, error => { throw error; });
    return { ...res, calls };
  } finally { pool.query = original; }
}

test('report updates reject invalid status and notes without querying the database', async () => {
  for (const body of [{ status: 'invalid' }, { status: 'resolved', admin_note: {} }, { status: 'reviewed', admin_note: 'a'.repeat(2001) }]) {
    const result = await callRoute('/reports/:id', body);
    assert.equal(result.statusCode, 400);
    assert.equal(result.calls.length, 0);
  }
});

test('omitted admin notes are preserved; an explicit empty note can clear a draft', async () => {
  const result = await callRoute('/reports/:id', { status: 'resolved' });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.calls[0][1], ['resolved', null, 1, '3']);
  assert.match(result.calls[0][0], /status IN \('pending', 'reviewed'\)/);
  const cleared = await callRoute('/reports/:id', { status: 'reviewed', admin_note: '' });
  assert.equal(cleared.calls[0][1][1], '');
});

test('a report already closed by another admin returns a conflict', async () => {
  const result = await callRoute('/reports/:id', { status: 'resolved' }, { rows: [], rowCount: 0 });
  assert.equal(result.statusCode, 409);
  assert.match(result.body.message, /Refresh/);
});

test('self bans are rejected and other admin accounts are excluded from ban updates', async () => {
  const self = await callRoute('/users/:id/ban', { banned: true }, undefined, 3);
  assert.equal(self.statusCode, 400);
  assert.equal(self.calls.length, 0);
  const admin = await callRoute('/users/:id/ban', { banned: true }, { rows: [], rowCount: 0 });
  assert.equal(admin.statusCode, 404);
  assert.match(admin.calls[0][0], /role <> 'admin'/);
});
