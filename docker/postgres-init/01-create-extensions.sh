#!/bin/bash
set -e
# Run as postgres superuser during first database initialization.
# The pgvector extension must exist before Drizzle migrations that use the `vector` type.
psql -v ON_ERROR_STOP=1 --dbname "$POSTGRES_DB" \
	-c "CREATE EXTENSION IF NOT EXISTS vector;"
