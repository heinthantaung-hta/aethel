import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMediaItem, validateRatingUpdate } from './validate.js';

function validate(middleware, body) {
  const req = { body: { ...body } };
  let error;
  middleware(req, {}, err => { error = err; });
  return { body: req.body, error };
}

const movie = { title: '  Arrival  ', release_year: '2016', completion_status: 'Want to Watch' };

test('every status can be saved unrated, including the original zero-star form', () => {
  for (const completion_status of ['Want to Watch', 'Watching', 'Completed']) {
    for (const rating of [undefined, null, '', 0, '0']) {
      const result = validate(validateMediaItem, { ...movie, completion_status, rating });
      assert.equal(result.error, undefined);
      assert.equal(result.body.rating, null);
      assert.equal(result.body.title, 'Arrival');
    }
  }
});

test('completed ratings are normalized, and unwatched ratings are cleared', () => {
  for (const completion_status of ['Want to Watch', 'Watching', 'Completed']) {
    const result = validate(validateMediaItem, { ...movie, completion_status, rating: '4' });
    assert.equal(result.error, undefined);
    assert.equal(result.body.rating, completion_status === 'Completed' ? 4 : null);
  }
});

test('invalid ratings are rejected before they reach the database', () => {
  for (const rating of [-1, 6, 1.5, 'oops', true, false, [], [3], {}, '   ']) {
    assert.equal(validate(validateMediaItem, { ...movie, rating }).error?.type, 'validation');
    assert.equal(validate(validateRatingUpdate, { rating }).error?.type, 'validation');
  }
});

test('rating edits accept all five whole-star values', () => {
  for (const rating of [1, 2, 3, 4, 5, '5']) {
    const result = validate(validateRatingUpdate, { rating });
    assert.equal(result.error, undefined);
    assert.equal(result.body.rating, Number(rating));
  }
});

test('rating edits require a rating', () => {
  for (const rating of [undefined, null, '', 0]) {
    assert.equal(validate(validateRatingUpdate, { rating }).error?.type, 'validation');
  }
});
