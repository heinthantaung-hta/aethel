-- Fail instead of removing records if an existing collection contains duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS media_items_user_tmdb_unique
ON media_items (user_id, tmdb_id) WHERE tmdb_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS media_items_user_title_year_unique
ON media_items (user_id, lower(btrim(title)), release_year);
