#!/bin/bash
set -e

echo "Running migrations..."
for f in /docker-entrypoint-initdb.d/migrations/*.sql; do
  echo "  Applying $f"
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"
done

echo "Running seeds..."
for f in /docker-entrypoint-initdb.d/seed/*.sql; do
  echo "  Seeding $f"
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"
done

echo "Database initialization complete."
