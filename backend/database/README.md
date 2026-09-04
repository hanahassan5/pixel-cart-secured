# Database

Run `npm run db:setup` from `backend` after configuring `.env`. Migrations are applied alphabetically, then `seed.sql` inserts idempotent development data. The Express server does not create or modify schema objects during startup.
