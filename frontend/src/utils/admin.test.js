import test from 'node:test';
import assert from 'node:assert/strict';
import { adminStats, filterAdminItems, paginate, canModerateUser } from './admin.js';

test('direct ban controls are limited to admins moderating another regular user', () => {
  const admin = { user_id: 1, role: 'admin' };
  assert.equal(canModerateUser(admin, { user_id: 2, role: 'user' }), true);
  assert.equal(canModerateUser(admin, { user_id: 2, role: 'admin' }), false);
  assert.equal(canModerateUser(admin, { user_id: 1, role: 'user' }), false);
  assert.equal(canModerateUser({ user_id: 3, role: 'user' }, { user_id: 2, role: 'user' }), false);
  assert.equal(canModerateUser(null, { user_id: 2, role: 'user' }), false);
  assert.equal(canModerateUser(admin, { user_id: 2 }), false);
});

test('overview counts remain global when the visible posts are filtered', () => {
  const posts = [{ status: 'published', title: 'Arrival' }, { status: 'flagged', title: 'Dune' }];
  assert.equal(filterAdminItems(posts, 'posts', 'arrival', 'published').length, 1);
  assert.deepEqual(adminStats({ posts, users: [{}, {}], reports: [{ status: 'pending' }, { status: 'resolved' }] }),
    { users: 2, published: 1, flagged: 1, pending: 1 });
  assert.equal(posts.length, 2);
});

test('user search matches email and combines with ban status', () => {
  const users = [{ username: 'jane', email: 'jane@example.com', is_banned: true }, { username: 'john', is_banned: false }];
  assert.deepEqual(filterAdminItems(users, 'users', ' EXAMPLE.COM ', 'banned'), [users[0]]);
  assert.deepEqual(filterAdminItems(users, 'users', 'jane', 'active'), []);
});

test('reports search includes reported content and handles deleted targets', () => {
  const reports = [{ reason: 'spam', status: 'pending', target_details: null },
    { reason: 'other', status: 'reviewed', target_details: { body: 'Spoiler for Arrival' } }];
  assert.deepEqual(filterAdminItems(reports, 'reports', 'arrival', 'reviewed'), [reports[1]]);
  assert.deepEqual(filterAdminItems(reports, 'reports', 'spam'), [reports[0]]);
  assert.equal(filterAdminItems(reports, 'reports').length, 2);
});

test('pagination clamps pages after deletion and handles empty results', () => {
  const items = Array.from({ length: 25 }, (_, id) => ({ id }));
  assert.deepEqual(paginate(items, 3).items, [{ id: 24 }]);
  assert.equal(paginate(items.slice(0, 24), 3).page, 2);
  assert.equal(paginate(items, -1).page, 1);
  assert.deepEqual(paginate([], 5), { page: 1, pages: 1, items: [] });
});
