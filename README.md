# Aethel

A movie collection and review app built with React, Vite, Express, and PostgreSQL.
Track your watchlist, rate completed movies, discover movies through TMDB, and
share reviews in the community feed.

The collection includes title/status/genre filters, sorting, duplicate protection,
and JSON backup/restore with a preview before importing.

## Requirements

- Node.js 22.12 or newer and npm.
- Docker with Docker Compose for the included PostgreSQL database.
- A TMDB API key for movie search and discovery.
- Optional: a Resend API key for sending verification emails.
- PostgreSQL client tools (`pg_dump` and `pg_restore`) for database backups and
  migrations. Use a `pg_dump` version compatible with your database server
  (PostgreSQL 16 for the included Docker database), and make sure it is on `PATH`.

Docker runs the database only. Start the backend and frontend separately below.

## 1. Get the project and install dependencies

```sh
git clone https://github.com/heinthantaung-ddzz/aethel.git
cd aethel
npm ci --prefix backend
npm ci --prefix frontend
```

If you already have the project, run the two `npm ci` commands from its root folder.

## 2. Configure the backend

Create a file named `.env` inside `backend` with the following settings:

```dotenv
PORT=3001
PGHOST=localhost
PGPORT=5432
PGUSER=aethel
PGPASSWORD=aethel_secret
PGDATABASE=aethel_db
JWT_SECRET=replace-with-a-long-random-secret
TMDB_API_KEY=replace-with-your-tmdb-api-key
TMDB_BASE_URL=https://api.themoviedb.org/3

# Optional: leave empty to print verification codes in the backend terminal.
RESEND_API_KEY=
FROM_EMAIL=Aethel <onboarding@resend.dev>
```

The database credentials above match `docker-compose.yml` and are intended for
local development. Generate a JWT secret with this command and paste its output
into `JWT_SECRET`:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Use a TMDB API key, not a bearer access token. When using Resend, configure a sender
allowed by your Resend account. Keep `.env` private; do not commit it to GitHub.
The frontend uses the Vite proxy and does not need its own `.env` for local use.

## 3. Start and initialize a fresh database

From the project root:

```sh
docker compose up -d postgres
```

Wait until PostgreSQL reports that it is accepting connections:

```sh
docker compose exec postgres pg_isready -U aethel -d aethel_db
```

For a **new, empty database only**, create the tables:

```sh
cd backend
npm run db:init
cd ..
```

`db:init` refuses to run when the public schema contains tables. The initialization
SQL creates a fresh schema and contains no destructive reset statements.

### Upgrading an existing database

Skip `db:init`. Apply the versioned migrations instead:

```sh
cd backend
npm run db:migrate
cd ..
```

The runner creates a full database backup in `backend/backups/` before applying
pending migrations. It records checksums and applies the batch in a transaction.
If backup or migration fails, no migration changes are committed. Existing
duplicates cause the uniqueness migration to stop; review them manually rather
than deleting data automatically. See [the upgrade notes](backend/UPGRADING.md).

## 4. Run the app

Open two terminals in the project root and keep both running.

**Terminal 1 — backend:**

```sh
cd backend
npm run dev
```

**Terminal 2 — frontend:**

```sh
cd frontend
npm run dev -- --port 5173 --strictPort
```

Open **http://localhost:5173** in your browser. The API runs at
http://localhost:3001; its health endpoint is http://localhost:3001/api/health.
The health endpoint checks that the API is running, not database connectivity.

Create an account on the signup page. With `RESEND_API_KEY` empty, find the email
verification code in the backend terminal. Then sign in, search for a movie, and
add it to your collection. Movies can stay unrated until you finish watching.

## Checks and build

Run these commands from the project root:

```sh
# Frontend collection tests
npm test --prefix frontend

# Backend validation, import, and migration tests
npm test --prefix backend

# Frontend lint and production build
npm run lint --prefix frontend
npm run build --prefix frontend
```

The build output is in `frontend/dist`. For deployment, serve it with a web server
that forwards `/api` and `/uploads` to the backend and supports React Router's
client-side routes. The backend starts with `npm start` from `backend`.
The Vite development proxy is not a production deployment configuration; deployed
origins also need to be configured in the backend's CORS settings.

## Stop the app

Press `Ctrl+C` in each app terminal. From the project root, stop the database with:

```sh
docker compose stop postgres
```

The database data remains in Docker's `pgdata` volume. Start it again with
`docker compose up -d postgres`; initialization is only needed for a fresh database.

## Back up and restore your collection

On **My Collection**, use **Download backup** to export your movies, watch status,
ratings, genres, posters, and dates added. Account details, passwords, posts, and
uploaded images are not included in this personal collection backup.

Choose **Restore backup**, select an Aethel JSON file, review the preview, and
click **Confirm restore**. Existing movies keep their ratings and status. Movies
with the same TMDB ID or the same title (ignoring case and surrounding spaces)
and release year are skipped. The result shows how many were added and skipped.
Invalid files are rejected, and a failed import is rolled back completely.

Each import accepts up to 1,000 movies and a file under 5 MB. Larger exports are
split into downloadable parts; download all parts and restore each separately.
Genres are matched by name. A backup containing genres absent from the target
database is rejected with an explanation, without partially importing movies.

For a **full database backup**, run `npm run db:backup` from `backend`. This uses
the configured PostgreSQL connection and includes sensitive account data, so
keep backup files private. See [UPGRADING.md](backend/UPGRADING.md) for recovery.

## Troubleshooting

- **Database connection refused:** check that Docker is running, PostgreSQL is
  ready, and the settings in `backend/.env` match your database.
- **Port 5432 is occupied:** stop the conflicting local PostgreSQL service, or
  change the host port in Compose and update `PGPORT` to match.
- **Port 5173 or 3001 is occupied:** stop the conflicting process and restart the
  app. If you change the API port, also update `frontend/vite.config.js`.
- **Movie search fails:** check `TMDB_API_KEY`, internet access, and backend logs.
- **No verification email:** with Resend disabled, use the code printed in the
  backend terminal; with Resend enabled, check the sender configuration and logs.
- **Saving an unrated movie fails:** apply the existing-database migration above.

## Project layout

```text
backend/              Express API, database schema, and maintenance scripts
frontend/             React application and Vite configuration
docker-compose.yml    Local PostgreSQL service and persistent data volume
```
