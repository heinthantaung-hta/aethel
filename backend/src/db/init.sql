-- ============================================================
-- Aethel Database Initialization Script
-- 3NF Schema with Auth, Social Feed, and Admin Support
-- ============================================================

DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS loves CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS media_item_genres CASCADE;
DROP TABLE IF EXISTS media_items CASCADE;
DROP TABLE IF EXISTS genres CASCADE;
DROP TABLE IF EXISTS item_types CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- 0. users
-- ============================================================
CREATE TABLE users (
    user_id       SERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    username      VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(100) DEFAULT '',
    bio           TEXT DEFAULT '',
    avatar_url    VARCHAR(500) DEFAULT '',
    role          VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verify_token VARCHAR(6),
    email_verify_expires TIMESTAMP,
    totp_secret   VARCHAR(256),
    totp_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
    recovery_codes TEXT[] DEFAULT '{}',
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users (email);

-- ============================================================
-- 1. item_types
-- ============================================================
CREATE TABLE item_types (
    type_id   SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO item_types (type_name) VALUES ('Movie'), ('Video Game'), ('Book');

-- ============================================================
-- 2. genres
-- ============================================================
CREATE TABLE genres (
    genre_id   SERIAL PRIMARY KEY,
    genre_name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO genres (genre_name) VALUES
  ('Action'), ('Adventure'), ('Animation'), ('Comedy'), ('Crime'),
  ('Documentary'), ('Drama'), ('Fantasy'), ('Horror'), ('Mystery'),
  ('Romance'), ('Sci-Fi'), ('Thriller'), ('War'), ('Western');

-- ============================================================
-- 3. media_items
-- ============================================================
CREATE TABLE media_items (
    item_id           SERIAL PRIMARY KEY,
    title             VARCHAR(255) NOT NULL,
    release_year      INT NOT NULL,
    rating            INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    completion_status VARCHAR(20) NOT NULL CHECK (
        completion_status IN ('Want to Watch', 'Watching', 'Completed')
    ),
    poster_url        TEXT DEFAULT '',
    overview          TEXT DEFAULT '',
    tmdb_id           INT,
    date_logged       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    type_id           INT NOT NULL REFERENCES item_types(type_id) ON DELETE RESTRICT,
    user_id           INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_media_items_date_logged ON media_items (date_logged DESC);
CREATE INDEX idx_media_items_backlog ON media_items (completion_status, date_logged ASC);
CREATE INDEX idx_media_items_user ON media_items (user_id);

-- ============================================================
-- 4. media_item_genres (junction)
-- ============================================================
CREATE TABLE media_item_genres (
    item_id  INT NOT NULL REFERENCES media_items(item_id) ON DELETE CASCADE,
    genre_id INT NOT NULL REFERENCES genres(genre_id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, genre_id)
);

-- ============================================================
-- 5. posts — Social feed entries
-- ============================================================
CREATE TABLE posts (
    post_id    SERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL,
    body       TEXT NOT NULL,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('Movie', 'Video Game', 'Book')),
    media_title VARCHAR(255) NOT NULL,
    status     VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'flagged', 'removed')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_posts_created ON posts (created_at DESC);
CREATE INDEX idx_posts_user ON posts (user_id);
CREATE INDEX idx_posts_status ON posts (status);

-- ============================================================
-- 6. loves — One love per user per post
-- ============================================================
CREATE TABLE loves (
    user_id    INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id    INT NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id)
);

-- ============================================================
-- 7. comments
-- ============================================================
CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    post_id    INT NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    user_id    INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    body       TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_post ON comments (post_id, created_at ASC);

-- ============================================================
-- 8. reports — User-submitted reports for moderation
-- ============================================================
CREATE TABLE reports (
    report_id     SERIAL PRIMARY KEY,
    reporter_id   INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    report_type   VARCHAR(20) NOT NULL CHECK (report_type IN ('post', 'user', 'comment')),
    target_id     INT NOT NULL,
    reason        VARCHAR(50) NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'misinformation', 'impersonation', 'other')),
    details       TEXT DEFAULT '',
    status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    admin_note    TEXT DEFAULT '',
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at   TIMESTAMP,
    resolved_by   INT REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_reports_status ON reports (status);
CREATE INDEX idx_reports_type ON reports (report_type, target_id);
CREATE UNIQUE INDEX idx_reports_unique ON reports (reporter_id, report_type, target_id);
