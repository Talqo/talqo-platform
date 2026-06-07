# RAG Pipeline Design

**Date:** 2026-05-10
**Branch:** SCRUM-120
**Status:** Approved

## Overview

Replace the current unused file-search agent tools with a proper RAG (Retrieval-Augmented Generation) pipeline. Uploaded context files are automatically chunked, embedded, and stored as vectors in PostgreSQL. When the widget AI responds, relevant chunks are pre-retrieved via cosine similarity and injected into the system prompt.

---

## Decisions

| Question | Decision |
|---|---|
| Library | Vercel AI SDK (`embedMany`) + pgvector |
| Vector store | PostgreSQL — same instance, new `file_embeddings` table |
| Indexing trigger | Automatic on file upload / delete / rename; also on provider config change |
| Retrieval strategy | Pre-retrieval: top-5 chunks injected into system prompt before `streamText()` |
| Vector dimensions | Variable — `vector` column without fixed size; no HNSW index (per-client sequential scan is adequate) |
| Anthropic fallback | Server-side embedding model via `DEFAULT_LLM_BASE_URL` + `DEFAULT_LLM_API_KEY` |
| Billing | Charge clients only when server-side embedding is used (Anthropic or no provider configured) |
| Pricing | `$0.02 / 1,000,000 tokens` — hardcoded constant, same pattern as `PLATFORM_MODEL_INPUT_RATE` |

---

## Data Flow

### Indexing (automatic, fire-and-forget)

```
File upload / delete / rename / provider config change
        │
        ▼
  files.routes.ts or provider-config.routes.ts
        │  fire-and-forget (errors logged, not surfaced to caller)
        ▼
  RagService
        ├── Read file content from S3
        ├── Chunk text (2 000-char chunks, 400-char overlap)
        ├── embedMany() via Vercel AI SDK
        ├── Upsert chunks into file_embeddings
        └── If server-side embedding used → insert usage_records row (type="embedding") + deduct balance
```

### Retrieval (per widget message)

```
Widget message received
        │
        ▼
  widget.service.ts
        ├── RagService.retrieve(clientId, message, topK=5)
        │       └── SELECT … ORDER BY embedding <=> queryVector LIMIT 5
        │                  WHERE client_id = $clientId
        ├── Inject chunks into system prompt (empty = no-op)
        └── streamText()
```

---

## Database Schema

### New table: `file_embeddings`

```sql
CREATE TABLE file_embeddings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  file_path           TEXT NOT NULL,
  chunk_index         INTEGER NOT NULL,
  chunk_text          TEXT NOT NULL,
  embedding           vector,          -- no fixed size; supports <=> operator
  embedding_dimensions INTEGER NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (client_id, file_path, chunk_index)
);

CREATE INDEX ON file_embeddings (client_id);
```

No HNSW index — requires fixed dimensions. Per-client filtered scan is fast enough at this scale.

### Modified table: `usage_records`

Add a `type` discriminator and make `message_id` nullable so embedding charges share the same billing table as message charges. This keeps all cost aggregations (balance deductions, monthly spend, analytics) in one place.

```sql
ALTER TABLE usage_records
  ADD COLUMN type VARCHAR(32) NOT NULL DEFAULT 'message',
  ALTER COLUMN message_id DROP NOT NULL;
```

`type` values: `"message"` (existing rows) | `"embedding"` (new rows from RAG indexing).

For embedding records `message_id` is `NULL`. Existing queries that filter or join on `message_id` are unaffected since they already scope to conversation/message context.

### Modified table: `ai_provider_configs`

Add one nullable column:

```sql
ALTER TABLE ai_provider_configs ADD COLUMN embedding_model VARCHAR(255);
```

`NULL` means use the provider default (see table below). Not shown in UI for `anthropic`.

---

## Embedding Model Selection

Resolution order: explicit config → provider default → server-side fallback.

| Client provider | Model used | Key/URL | Billed by Talqo? |
|---|---|---|---|
| `openai` | `embeddingModel` ?? `text-embedding-3-small` | client's own key | No |
| `google` | `embeddingModel` ?? `text-embedding-004` | client's own key | No |
| `openai_compatible` | `embeddingModel` (required — no default) | client's own key | No |
| `anthropic` | `DEFAULT_EMBEDDING_MODEL` env var | `DEFAULT_LLM_API_KEY` + `DEFAULT_LLM_BASE_URL` | **Yes** |
| no provider configured | `DEFAULT_EMBEDDING_MODEL` env var | `DEFAULT_LLM_API_KEY` + `DEFAULT_LLM_BASE_URL` | **Yes** |

### New env var

```
DEFAULT_EMBEDDING_MODEL=qwen3-embedding-4b
```

Added to `apps/api/src/common/config.ts` Zod schema as `z.string().optional()`.
Added as a GitHub secret → k8s secret → env var (same CD path as `DEFAULT_LLM_API_KEY`).

No new base URL or API key env vars — reuses `DEFAULT_LLM_BASE_URL` and `DEFAULT_LLM_API_KEY`.

### Pricing constant

```typescript
// apps/api/src/modules/rag/rag.service.ts
const PLATFORM_EMBEDDING_RATE = 0.02 / 1_000_000  // $0.02 per 1M tokens (qwen3-embedding-4b)
```

---

## Chunking Strategy

Character-based splitting with word-boundary alignment — no tokenizer dependency.

Using a real tokenizer (e.g. `js-tiktoken`) is impractical here because each client uses a different embedding model (OpenAI, Google, qwen3) with a different tokenizer. Exact token counts don't meaningfully affect RAG quality; consistent, semantically clean chunk boundaries matter more.

- **Chunk size:** at most 2 000 characters — scan backward from position 2 000 to find the nearest preceding whitespace; hard cut at exactly 2 000 only if no whitespace is found between `start` and position 2 000. Chunks are always ≤ 2 000 chars.
- **Overlap:** 400 characters — the next chunk starts 1 600 chars after the previous chunk's `start`; the overlap window is snapped backward to the nearest preceding whitespace so chunk boundaries align with word breaks

Implemented as a pure function in `rag.chunking.ts`:

```typescript
type Chunk = { index: number; text: string }
function chunkText(text: string): Chunk[]
```

---

## Module Structure

New module: `apps/api/src/modules/rag/`

```
rag/
├── rag.chunking.ts     -- pure: text → Chunk[]; no I/O
├── rag.repository.ts   -- DB: upsert, delete by file/client, cosine search, record usage
├── rag.service.ts      -- orchestrate: index, remove, rename, retrieve; billing logic
└── index.ts            -- wire repo → service, export RagService instance
```

### `rag.service.ts` public API

```typescript
indexFile(clientId: string, filePath: string): Promise<void>
removeFile(clientId: string, filePath: string): Promise<void>
renameFile(clientId: string, oldPath: string, newPath: string): Promise<void>
removeAllFiles(clientId: string): Promise<void>
retrieve(clientId: string, message: string, topK?: number): Promise<string[]>
```

`indexFile` flow:
1. Read file from S3 via `FilesService`
2. Chunk with `chunkText()`
3. Resolve embedding model from client's provider config
4. `embedMany(model, chunks.map(c => c.text))`
5. Upsert all chunks into `file_embeddings` (unique constraint handles re-index)
6. If server-side embedding: insert `usage_records` row (`type = "embedding"`, `message_id = NULL`), deduct `costUsd` from `clients.balance_usd`

`retrieve` flow:
1. Resolve embedding model (same logic as indexing)
2. `embed(model, message)` — single vector
3. `SELECT chunk_text FROM file_embeddings WHERE client_id = $1 ORDER BY embedding <=> $2 LIMIT $3`
4. Return `chunk_text[]`

---

## File Mutation Hooks

| Endpoint | Hook |
|---|---|
| `POST /client/me/files` (upload) | `ragService.indexFile(clientId, filePath)` |
| `DELETE /client/me/files` | `ragService.removeFile(clientId, filePath)` |
| `POST /client/me/files/move` (rename) | `ragService.renameFile(clientId, oldPath, newPath)` |
| Provider config upsert | Collect all file paths, call `ragService.indexFile()` for each (upsert — no data-loss window), then handle stale entry cleanup |

All hooks fire-and-forget. Errors are logged via the request logger but do not affect the HTTP response.

### Durability requirements for indexing hooks

Indexing hooks must implement exponential backoff with jitter on transient failures:

- `maxAttempts`: 3 (configurable)
- `backoffBaseMs`: 200 ms (configurable)
- Backoff formula: `backoffBaseMs * 2^attempt + jitter(0–100 ms)`
- On permanent failure (all attempts exhausted): log at `error` level via the request logger with the `clientId`, `filePath`, and final error; do not throw (hook must not affect the HTTP response)
- Retryable errors: network/connection errors, embedding API 429/5xx
- Non-retryable: 400 validation errors, missing file content

---

## Widget Integration

In `widget.service.ts`, before the `streamText()` call:

```typescript
const chunks = await ragService.retrieve(clientId, message)
const ragContext = chunks.length > 0
  ? `\n\n<context>\n${chunks.join("\n")}\n</context>`
  : ""

const system = [PLATFORM_SYSTEM_PROMPT, botConfig.systemPrompt, botConfig.toneStyle, ragContext]
  .filter(Boolean)
  .join("\n")
```

If the client has no indexed files, `retrieve` returns `[]` and `ragContext` is an empty string — zero overhead on the system prompt.

---

## Provider Config UI Changes

- `embeddingModel` text field added to the provider config form for `openai`, `google`, and `openai_compatible` providers
- Field is optional for `openai` and `google` (placeholder shows the default model name)
- Field is required for `openai_compatible` (no sensible default); API route validates this in addition to form validation
- Field is hidden entirely for `anthropic` (handled server-side)

---

## Out of Scope (V1)

- HNSW index — requires fixed dimensions; revisit if client file counts grow significantly
- Indexing status UI (showing "indexed / pending / failed" per file)
- Automatic re-index scheduling
- Similarity score threshold filtering (currently returns top-K unconditionally)
- Support for non-text file types (PDFs, DOCX) — current upload validation already restricts to text files
