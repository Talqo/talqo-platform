-- Placeholder seed script for Docker Compose PostgreSQL initialization.
-- Once packages/db has Drizzle schema, replace this with Drizzle migrations.
-- This file runs automatically on first container start via docker-entrypoint-initdb.d.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
