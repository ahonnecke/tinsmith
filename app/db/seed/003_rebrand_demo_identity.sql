-- Rebrand the demo identities from the pre-Tinsmith domain.
--
-- Why this is a new file rather than an edit to 001_demo_data.sql:
-- db/migrate.mjs keys its schema_migrations ledger on FILENAME, not on a hash
-- of the contents. 001 already ran against the deployed database when the
-- product was called "HVAC 3.0", so editing it in place changes what a fresh
-- database gets while leaving every existing database untouched — the deployed
-- demo login stayed admin@demo.hvac3.dev while the docs advertised
-- admin@demo.tinsmith.dev. Migrations go forward.
--
-- Idempotent by construction: matches only the old addresses, so it is a no-op
-- on a fresh database that seeded 001 with the current values, and a no-op on
-- reruns. Password hashes are untouched (still "password123").

UPDATE users
   SET email = 'admin@demo.tinsmith.dev'
 WHERE email = 'admin@demo.hvac3.dev';

UPDATE users
   SET email = 'engineer@demo.tinsmith.dev'
 WHERE email = 'engineer@demo.hvac3.dev';
