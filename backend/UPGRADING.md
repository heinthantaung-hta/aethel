# Database upgrades and recovery

Run maintenance commands from `backend` so they load `backend/.env`.
For hosted PostgreSQL, use a direct or session-mode database connection for
maintenance; transaction-pooling endpoints are unsuitable for migration locks.

## Versioned migrations

```sh
npm run db:migrate
```

Requirements: a working PostgreSQL connection and `pg_dump` on `PATH`, with a
version compatible with the server. Stop application writes during maintenance.

The runner:

1. Locks migration execution to prevent two runners overlapping.
2. Verifies checksums of already-applied migrations.
3. Creates a full custom-format PostgreSQL dump in `backend/backups/`.
4. Applies pending SQL files in order in one transaction and records their checksums.
5. Rolls back the batch if any SQL statement fails.

No schema changes are made if the backup fails. If nothing is pending, the
command reports that the database is up to date without creating another dump.
Never edit an applied migration; add a new numbered SQL file instead.

Included migrations:

- `001_allow_unrated.sql`: permits empty ratings, preserving existing ratings.
- `002_unique_movies.sql`: prevents duplicate movies per user by TMDB ID or
  case-insensitive, trimmed title plus release year.

If existing duplicates prevent migration, the entire batch rolls back and all
records remain. Review duplicates in the affected collection, decide which entry
to keep, and rerun. The application also serializes add/edit/import operations per
user and checks for duplicates before writing. Different users can save the same movie.

The older `node scripts/allow-unrated.js` command remains compatible, but use the
versioned runner for future upgrades. It safely handles an already-nullable rating.

## Full database backup

```sh
npm run db:backup
```

Backups contain the database schema and data, including account information.
Files are created with owner-only permissions and excluded from Git. Copy backups
to secure storage outside this machine. Avatar files in `backend/uploads/` must
be backed up separately; PostgreSQL dumps contain their paths, not image files.

## Restore into a separate, empty database

Use an empty recovery database to inspect the backup before changing the app's
connection. With PostgreSQL client tools and connection settings configured in
your shell, run:

```sh
pg_restore --no-owner --no-acl --exit-on-error --single-transaction \
  --dbname=aethel_recovery backups/YOUR_BACKUP_FILE.dump
```

Create `aethel_recovery` first using your database administration tool. Replace the
example database and file names. `pg_restore` does not load `.env`; supply its
connection settings through your shell's PostgreSQL environment variables or
your provider's documented connection method. Do not put credentials into Git.

Verify restored records, then point `backend/.env` at the recovered database and
restart the backend when ready. This process does not overwrite the original database.

## Fresh installation

`npm run db:init` is only for a new database. It refuses a public schema containing
tables and wraps initialization in a transaction. Fresh schemas already include
nullable ratings and duplicate constraints. `db:migrate` can subsequently register
the migrations safely.

## Verification

```sh
npm test
```

Tests cover backup formats, ownership scoping, duplicate skipping, import rollback,
and migration backup/failure/checksum behavior. Database calls in these regression
tests use test doubles; run and verify migrations against a staging database
before deploying. Collection JSON backups in the UI are separate from full
database backups and only restore the signed-in user's movie library.
