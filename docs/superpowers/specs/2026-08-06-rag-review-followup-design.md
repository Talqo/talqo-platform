# RAG Review Follow-up Design

## Goal

Address the seven unresolved PR #13 comments without allowing concurrent requests
to overload an embedding provider or coupling cheap file operations to long provider
calls.

## Coordination

File mutations use local per-file queues and database-backed per-file leases. Lock
acquisition uses exponential backoff capped at one second. Upload, delete, rename,
and reindex operations for the same file remain ordered, while unrelated file
uploads can proceed concurrently.

Embedding calls use a separate scheduling layer. The shared platform provider has
one global serial queue. Client-owned providers have one serial queue per client.
An indexing job waits for its provider slot before acquiring its file lease, so it
does not poll or hold a file lock while another provider request runs.

## Status And API Behavior

An upload indexes automatically by default for existing API consumers. The
dashboard sends `index=false` and calls `/reindex` explicitly so it can continue to
show distinct upload and embedding phases.

If reindexing fails while last-good chunks exist, the file status becomes `stale`.
Those chunks remain searchable and the dashboard explains that the previous
version is active and retryable. A failure without chunks remains `failed`.

Deleting a file removes its rate-limit state. Renaming a file moves rate-limit
state to the destination without violating the composite key.

## Billing

The platform reserves estimated usage before calling the provider. On success,
the final transaction reconciles the reservation against provider-reported token
usage when available, refunds over-reservation, charges any positive difference
with a balance guard, records actual usage, and replaces chunks atomically.

## Migration

All schema and data changes remain in the unapplied `0022` migration. The legacy
status backfill processes bounded batches rather than one unbounded insert. The
snapshot and journal contain only `0022`.

## Verification

Tests cover provider serialization, unrelated file concurrency, lock backoff,
rate-limit delete/rename behavior, stale status behavior, default upload indexing,
dashboard opt-out, and billing reconciliation. Final verification runs formatting,
type checks, unit tests, integration tests, and E2E tests against a fresh database.
