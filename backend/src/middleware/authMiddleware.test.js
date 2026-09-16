import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { authenticate, JWT_SECRET } from './authMiddleware.js';
import pool from '../config/db.js';

async function check(rows, token = jwt.sign({ user_id: 1 }, JWT_SECRET), databaseError = null) {
  const original = pool.query;
  let queries = 0;
  pool.query = async () => { queries++; if (databaseError) throw databaseError; return { rows }; };
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
  let proceeded = false;
  let forwarded;
  try {
    await authenticate({ headers: { authorization: `Bearer ${token}` } }, res, error => { proceeded = !error; forwarded = error; });
    return { ...res, proceeded, forwarded, queries };
  } finally { pool.query = original; }
}

test('a valid existing token is blocked after the account is banned', async () => {
  const result = await check([{ is_banned: true }]);
  assert.equal(result.statusCode, 403);
  assert.equal(result.proceeded, false);
});

test('active accounts proceed and deleted accounts cannot reuse old tokens', async () => {
  assert.equal((await check([{ is_banned: false }])).proceeded, true);
  assert.equal((await check([])).statusCode, 401);
});

test('invalid tokens never query the database', async () => {
  const result = await check([], 'invalid');
  assert.equal(result.statusCode, 401);
  assert.equal(result.queries, 0);
});

test('database errors are forwarded instead of being mistaken for bad credentials', async () => {
  const error = new Error('Database unavailable');
  const result = await check([], undefined, error);
  assert.equal(result.forwarded, error);
  assert.equal(result.proceeded, false);
});
