# Unrated movies

Movies can now be saved without a rating. Only completed movies receive a rating;
completed movies may also remain unrated until the user chooses one.

For an existing database, run this from `backend` before starting the updated API:

```sh
node scripts/allow-unrated.js
```

The script uses the database configured in `backend/.env`. It removes only the
`NOT NULL` requirement on ratings, preserves all records and existing ratings,
and can be run again safely. The 1–5 constraint remains in place.
Do not use `db:init` to upgrade an existing database: it drops existing tables.

Fresh databases use the updated schema automatically.

Run the rating regression tests with:

```sh
node --test src/middleware/validate.test.js
```
