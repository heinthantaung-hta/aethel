const VALID_STATUSES = ['Want to Watch', 'Watching', 'Completed'];

/**
 * Validates the request body for creating or updating a media item (movies-only).
 */
export function validateMediaItem(req, res, next) {
  const errors = [];
  const { title, release_year, rating, completion_status, genre_ids } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push('title is required and must be a non-empty string.');
  }

  if (release_year === undefined || release_year === null) {
    errors.push('release_year is required.');
  } else {
    const year = Number(release_year);
    if (!Number.isInteger(year) || year < 1800 || year > 2100) {
      errors.push('release_year must be an integer between 1800 and 2100.');
    }
  }

  if (rating === undefined || rating === null) {
    errors.push('rating is required.');
  } else {
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      errors.push('rating must be an integer between 1 and 5.');
    }
  }

  if (!completion_status || !VALID_STATUSES.includes(completion_status)) {
    errors.push(`completion_status must be one of: ${VALID_STATUSES.join(', ')}.`);
  }

  if (genre_ids !== undefined) {
    if (!Array.isArray(genre_ids)) {
      errors.push('genre_ids must be an array of integers.');
    } else if (genre_ids.some(id => !Number.isInteger(Number(id)))) {
      errors.push('All genre_ids must be valid integers.');
    }
  }

  if (errors.length > 0) {
    const err = new Error(errors.join(' '));
    err.type = 'validation';
    err.details = errors;
    return next(err);
  }

  // Normalize types
  req.body.title = title.trim();
  req.body.release_year = Number(release_year);
  req.body.rating = Number(rating);
  req.body.genre_ids = genre_ids ? genre_ids.map(Number) : [];
  if (req.body.poster_url && typeof req.body.poster_url !== 'string') req.body.poster_url = '';
  if (req.body.overview && typeof req.body.overview !== 'string') req.body.overview = '';
  if (req.body.tmdb_id) req.body.tmdb_id = Number(req.body.tmdb_id) || null;

  next();
}

/**
 * Validates the request body for PATCH status updates.
 */
export function validateStatusUpdate(req, res, next) {
  const { completion_status } = req.body;

  if (!completion_status || !VALID_STATUSES.includes(completion_status)) {
    const err = new Error(`completion_status must be one of: ${VALID_STATUSES.join(', ')}.`);
    err.type = 'validation';
    return next(err);
  }

  next();
}
