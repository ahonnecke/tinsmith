#!/usr/bin/env node
/**
 * Database migration runner — applies db/migrations then db/seed against
 * DATABASE_URL. Idempotent: every applied file is recorded in a
 * schema_migrations ledger, so re-running (e.g. on every Fly deploy via the
 * release_command) only applies files that haven't run yet.
 *
 * Each file runs inside its own transaction; on failure the transaction is
 * rolled back and the process exits non-zero so a deploy fails loudly rather
 * than shipping against a half-migrated database.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const HERE = dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

function sqlFiles(dir) {
  return readdirSync(join(HERE, dir))
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({ key: `${dir}/${f}`, path: join(HERE, dir, f) }));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('migrate: DATABASE_URL is not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename    TEXT PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const applied = new Set(
      (await client.query('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename),
    );

    // migrations first (schema), then seed (reference + demo data)
    const files = [...sqlFiles('migrations'), ...sqlFiles('seed')];
    const pending = files.filter((f) => !applied.has(f.key));

    if (pending.length === 0) {
      console.log('migrate: up to date, nothing to apply');
      return;
    }

    for (const file of pending) {
      const sql = readFileSync(file.path, 'utf8');
      console.log(`migrate: applying ${file.key}`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file.key]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`migrate: FAILED on ${file.key}\n${err.message}`);
        process.exit(1);
      }
    }

    console.log(`migrate: applied ${pending.length} file(s)`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`migrate: ${err.message}`);
  process.exit(1);
});
