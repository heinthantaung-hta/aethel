# Aethel

A movie collection and review app built with React, Vite, Express, and PostgreSQL.
Track your watchlist, rate completed movies, discover movies through TMDB, and
share reviews in the community feed.

## Requirements

- Node.js 22.12 or newer and npm.
- Docker with Docker Compose for the included PostgreSQL database.
- A TMDB API key for movie search and discovery.
- Optional: a Resend API key for sending verification emails.

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

**`db:init` drops and recreates tables. Do not run it against a database containing
data you want to keep.**

### Upgrading an existing database

Skip `db:init`. To enable saving unrated movies, run:

```sh
cd backend
node scripts/allow-unrated.js
cd ..
```

This migration preserves existing records and ratings and can be run repeatedly.
See [the upgrade notes](backend/UPGRADING.md).

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

# Backend rating validation tests
node --test backend/src/middleware/validate.test.js

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
