# RAG Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace unused file-search agent tools with a full RAG pipeline — auto-index uploaded files into pgvector, pre-retrieve relevant chunks per widget message.

**Architecture:** Vercel AI SDK `embedMany`/`embed` for embeddings; pgvector `vector` column (no fixed dimensions) in the existing PostgreSQL instance; fire-and-forget indexing triggered by file mutations and provider config changes; top-5 chunk injection into system prompt before `streamText()`.

**Tech Stack:** Bun, Drizzle ORM, pgvector, Vercel AI SDK v6 (`@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/openai-compatible`), `customType` from `drizzle-orm/pg-core`

**Spec:** `docs/superpowers/specs/2026-05-10-rag-pipeline-design.md`

---

> **Spec gap flagged:** `retrieve()` embeds the user's query on every widget message. For Anthropic clients this hits the server-side embedding API. Bill these tokens too (same rate, same `usage_records` insert) — same logic as indexing billing.
>
> **Spec gap flagged:** If `DEFAULT_EMBEDDING_MODEL` is not set and the client is Anthropic (needs server-side embedding), log an error and skip indexing/retrieval silently — do not throw.

---

## File Map

**Create:**
- `packages/db/src/schema/rag.ts` — `fileEmbeddings` table
- `packages/db/src/dto/rag.dto.ts` — DTO/Zod for fileEmbeddings
- `apps/api/src/modules/rag/rag.chunking.ts` — pure text chunker
- `apps/api/src/modules/rag/rag.chunking.test.ts`
- `apps/api/src/modules/rag/rag.embedding.ts` — embedding model factory
- `apps/api/src/modules/rag/rag.repository.ts` — DB queries + InMemory variant
- `apps/api/src/modules/rag/rag.service.ts` — orchestration + billing
- `apps/api/src/modules/rag/rag.service.test.ts`
- `apps/api/src/modules/rag/index.ts` — singleton wiring

**Modify:**
- `packages/db/src/schema/client.ts` — add `embeddingModel` to `aiProviderConfigs`
- `packages/db/src/schema/usage.ts` — `messageId` nullable, add `type` varchar column
- `packages/db/src/schema/index.ts` — export `rag.ts`
- `packages/db/src/dto/client.dto.ts` — add `embeddingModel` to response schema
- `packages/db/src/dto/usage.dto.ts` — reflect nullable `messageId`
- `packages/db/src/dto/index.ts` — export `rag.dto.ts`
- `packages/shared/src/validators/provider-config.ts` — add optional `embeddingModel` to all branches
- `apps/api/src/common/config.ts` — add `DEFAULT_EMBEDDING_MODEL` env var
- `apps/api/src/modules/provider-config/provider-config.service.ts` — thread `embeddingModel` through
- `apps/api/src/modules/provider-config/provider-config.repository.ts` — include `embeddingModel` in upsert
- `apps/api/src/modules/provider-config/provider-config.routes.ts` — pass `embeddingModel` from body; fire RAG re-index on upsert/delete
- `apps/api/src/modules/files/files.routes.ts` — accept optional `ragService` in factory; fire index/remove/rename hooks
- `apps/api/src/modules/files/index.ts` — pass `ragService` to router factory
- `apps/api/src/modules/widget/widget.service.ts` — add optional `ragService` dep; call `retrieve()` before `streamText()`
- `apps/api/src/modules/widget/index.ts` — wire `ragService` into `WidgetService`
- `apps/web/src/schemas/provider-config.ts` — add optional `embeddingModel`
- `apps/web/src/components/settings/ProviderConfigTab.tsx` — add `embeddingModel` form field + display
- `apps/web/src/api/hooks/useProviderConfig.ts` — include `embeddingModel` in types
- `apps/web/public/locales/en/translation.json` — new `embeddingModel` i18n keys
- `apps/web/public/locales/cs/translation.json`
- `apps/web/public/locales/zh/translation.json`

---

## Task 1: DB Schema — fileEmbeddings + usageRecords + embeddingModel

**Files:**
- Create: `packages/db/src/schema/rag.ts`
- Modify: `packages/db/src/schema/client.ts`
- Modify: `packages/db/src/schema/usage.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Create `packages/db/src/schema/rag.ts`**

  Define `fileEmbeddings` table using `customType` from `drizzle-orm/pg-core` to create a `vector` column with no fixed dimension (dataType returns `"vector"`). The custom type serialises `number[]` to/from the pgvector wire format `[1.0,2.0,...]`. Columns: `id`, `clientId` (FK → clients cascade), `filePath` (text), `chunkIndex` (integer), `chunkText` (text), `embedding` (custom vector type), `embeddingDimensions` (integer), `createdAt`. Add a unique constraint on `(clientId, filePath, chunkIndex)` and an index on `clientId`.

- [ ] **Modify `packages/db/src/schema/client.ts`**

  Add `embeddingModel: varchar("embedding_model", { length: 255 })` (nullable) to `aiProviderConfigs`.

- [ ] **Modify `packages/db/src/schema/usage.ts`**

  Remove `.notNull()` from `messageId` (keep the FK reference — nulls are FK-exempt in PostgreSQL). Add `type: varchar("type", { length: 32 }).notNull().default("message")`.

- [ ] **Modify `packages/db/src/schema/index.ts`**

  Add `export * from "./rag"`.

- [ ] **Commit**

  ```bash
  git commit -m "feat(db): add file_embeddings schema, make usage_records.message_id nullable, add embeddingModel to provider config"
  ```

---

## Task 2: DB Migration

**Files:**
- `packages/db/drizzle/` (generated)

- [ ] **Generate migration**

  ```bash
  cd packages/db && bun run db:generate
  ```

- [ ] **Prepend pgvector extension to the generated migration**

  Open the newly created file in `packages/db/drizzle/`. Add as the very first statement:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```

- [ ] **Run migration**

  ```bash
  bun run db:migrate
  ```

  Expected: migration runs without error; `file_embeddings` table and updated `usage_records` exist in DB.

- [ ] **Commit**

  ```bash
  git commit -m "chore(db): add pgvector migration"
  ```

---

## Task 3: DB DTOs

**Files:**
- Modify: `packages/db/src/dto/client.dto.ts`
- Modify: `packages/db/src/dto/usage.dto.ts`
- Create: `packages/db/src/dto/rag.dto.ts`
- Modify: `packages/db/src/dto/index.ts`

- [ ] **Update `client.dto.ts`**

  Add `embeddingModel: z.string().nullable()` to `aiProviderConfigResponseSchema` (and the masked variant). Update the inferred `AiProviderConfigMaskedResponse` type.

- [ ] **Update `usage.dto.ts`**

  `createSelectSchema(usageRecords)` will now pick up nullable `messageId` and the new `type` column automatically. Verify the schema reflects this and export updated type.

- [ ] **Create `rag.dto.ts`**

  Use `createSelectSchema(fileEmbeddings)` for a basic select schema. Override `createdAt` to `z.string()`. Export `FileEmbeddingResponse` type. No insert schema needed publicly.

- [ ] **Update `dto/index.ts`**

  Add `export * from "./rag.dto"`.

- [ ] **Build packages/db and verify no type errors**

  ```bash
  cd packages/db && bun run build && bun run type-check
  ```

- [ ] **Commit**

  ```bash
  git commit -m "feat(db): add RAG DTOs, update provider config + usage schemas"
  ```

---

## Task 4: Shared Schemas + API Config

**Files:**
- Modify: `packages/shared/src/validators/provider-config.ts`
- Modify: `apps/api/src/common/config.ts`

- [ ] **Update `provider-config.ts` in shared**

  Add `embeddingModel: z.string().trim().min(1).max(255).optional()` to every branch of the discriminated union (openai, openai_compatible, google, anthropic). Update the exported `UpsertProviderConfigBody` type.

- [ ] **Rebuild shared**

  ```bash
  cd packages/shared && bun run build && bun run type-check
  ```

- [ ] **Add `DEFAULT_EMBEDDING_MODEL` to `config.ts`**

  Add `DEFAULT_EMBEDDING_MODEL: z.string().optional()` to the `envSchema` object. Add `normalizeEmpty` preprocessing for it (same pattern as other DEFAULT_LLM_* vars). Export it from the `config` object.

- [ ] **Commit**

  ```bash
  git commit -m "feat(config): add DEFAULT_EMBEDDING_MODEL env var; add embeddingModel to provider config schema"
  ```

---

## Task 5: RAG — Chunking Utility

**Files:**
- Create: `apps/api/src/modules/rag/rag.chunking.ts`
- Create: `apps/api/src/modules/rag/rag.chunking.test.ts`

- [ ] **Write failing tests first (`rag.chunking.test.ts`)**

  Cover: empty string → `[]`; short text (< 2000 chars) → single chunk with index 0; text exactly 2000 chars → single chunk; text that requires splitting → multiple chunks with correct overlap; no mid-word splits (chunk boundaries always land on whitespace); hard cut when no whitespace exists in a segment.

- [ ] **Run tests — expect failures**

  ```bash
  cd apps/api && bun test src/modules/rag/rag.chunking.test.ts
  ```

- [ ] **Implement `rag.chunking.ts`**

  Export `type Chunk = { index: number; text: string }` and `function chunkText(text: string, chunkSize = 2000, overlap = 400): Chunk[]`.

  Algorithm: walk the string with a sliding window; at each `chunkSize` mark snap backward to the nearest preceding whitespace (hard-cut if none found, with a reasonable back-look limit of 200 chars); start the next chunk at `(endPosition - overlap)` snapped backward to the nearest whitespace.

- [ ] **Run tests — expect pass**

  ```bash
  cd apps/api && bun test src/modules/rag/rag.chunking.test.ts
  ```

- [ ] **Commit**

  ```bash
  git commit -m "feat(rag): add character-based chunking utility"
  ```

---

## Task 6: RAG — Embedding Model Factory

**Files:**
- Create: `apps/api/src/modules/rag/rag.embedding.ts`

- [ ] **Implement `rag.embedding.ts`**

  Export `function createEmbeddingModel(providerConfig: AiProviderConfig | null, serverConfig: { model?: string; apiKey?: string; baseUrl?: string }): EmbeddingModel<string> | null`.

  Logic:
  - `openai` → `createOpenAI({ apiKey, baseURL }).embedding(embeddingModel ?? "text-embedding-3-small")`
  - `google` → `createGoogleGenerativeAI({ apiKey, baseURL }).textEmbeddingModel(embeddingModel ?? "text-embedding-004")`
  - `openai_compatible` → `createOpenAICompatible({ name: "custom", apiKey, baseURL }).textEmbeddingModel(embeddingModel)` — return null if `embeddingModel` is not set
  - `anthropic` or `null` (no provider) → use server config: `createOpenAICompatible({ name: "platform", apiKey: serverConfig.apiKey, baseURL: serverConfig.baseUrl }).textEmbeddingModel(serverConfig.model)` — return null if any server config field is missing

  `embeddingModel` comes from the `AiProviderConfig` (which will gain this field in a later task).

  Note: `AiProviderConfig` in `packages/shared/src/types/agent.ts` must be updated to include optional `embeddingModel?: string` on each variant.

- [ ] **Update `packages/shared/src/types/agent.ts`**

  Add `embeddingModel?: string` to `BaseConfig` (or individually to each variant — `BaseConfig` is cleaner).

- [ ] **Rebuild shared**

  ```bash
  cd packages/shared && bun run build
  ```

- [ ] **Commit**

  ```bash
  git commit -m "feat(rag): add embedding model factory"
  ```

---

## Task 7: RAG — Repository

**Files:**
- Create: `apps/api/src/modules/rag/rag.repository.ts`

- [ ] **Implement `RagRepository` class**

  Methods:
  - `upsertChunks(chunks: { clientId, filePath, chunkIndex, chunkText, embedding: number[], embeddingDimensions }[]): Promise<void>` — batch insert with `onConflictDoUpdate` on unique constraint
  - `deleteByFile(clientId: string, filePath: string): Promise<void>`
  - `deleteByClient(clientId: string): Promise<void>`
  - `renameFile(clientId: string, oldPath: string, newPath: string): Promise<void>` — `UPDATE file_embeddings SET file_path = $new WHERE client_id = $1 AND file_path = $old`
  - `search(clientId: string, queryVector: number[], topK: number): Promise<string[]>` — use `sql` template from drizzle for the `<=>` operator: `ORDER BY embedding <=> '[...]'::vector LIMIT $topK`. The query vector must be formatted as `[n1,n2,...]` string for pgvector.
  - `recordUsage(clientId: string, tokensUsed: number, costUsd: string): Promise<void>` — insert into `usage_records` with `type = "embedding"`, `messageId = null`

- [ ] **Export `InMemoryRagRepository`** in the same file

  Backs methods with in-memory Maps/arrays. Used in tests. Must satisfy the same interface as `RagRepository`.

- [ ] **Commit**

  ```bash
  git commit -m "feat(rag): add RAG repository with in-memory variant"
  ```

---

## Task 8: RAG — Service

**Files:**
- Create: `apps/api/src/modules/rag/rag.service.ts`
- Create: `apps/api/src/modules/rag/rag.service.test.ts`

- [ ] **Write failing tests (`rag.service.test.ts`)**

  Use `mock.module("ai", ...)` to mock `embedMany` / `embed` (same pattern as `agent.service.test.ts`).
  Use `InMemoryRagRepository`.
  Mock S3 file read (pass a mock read function or mock Bun.S3Client).

  Test cases:
  - `indexFile` stores correct number of chunks for a known text
  - `indexFile` with Anthropic provider + missing server config → no chunks stored, no error thrown
  - `indexFile` with server-side provider → records usage (tokens > 0, costUsd > "0")
  - `indexFile` with client-owned provider → no usage recorded
  - `removeFile` deletes only chunks for the given file
  - `removeAllFiles` deletes all chunks for the client
  - `renameFile` updates file path without changing chunk content
  - `retrieve` returns empty array when no chunks exist
  - `retrieve` returns top-K results when chunks exist

- [ ] **Run tests — expect failures**

  ```bash
  cd apps/api && bun test src/modules/rag/rag.service.test.ts
  ```

- [ ] **Implement `RagService`**

  Constructor deps: `repo: RagRepository`, `providerConfigRepo: ProviderConfigRepository`, `s3: S3Client`, `serverEmbeddingConfig: { model?: string; apiKey?: string; baseUrl?: string }`.

  `PLATFORM_EMBEDDING_RATE = 0.02 / 1_000_000`

  `indexFile(clientId, filePath)`:
  1. Read file text from S3: `s3.file(`${clientId}/${filePath}`).text()`
  2. `chunkText(content)` → chunks
  3. Resolve provider config from DB, decrypt key, build `AiProviderConfig`
  4. `createEmbeddingModel(providerConfig, serverConfig)` → if null, log warning and return
  5. Determine `isServerSide` (providerConfig is null or type is "anthropic")
  6. `embedMany({ model, values: chunks.map(c => c.text) })` → `{ embeddings, usage }`
  7. `repo.upsertChunks(...)` with dimensions = `embeddings[0].length`
  8. If `isServerSide`: `repo.recordUsage(clientId, usage.tokens, (usage.tokens * PLATFORM_EMBEDDING_RATE).toFixed(6))`

  `retrieve(clientId, message, topK = 5)`:
  1. Resolve provider + embedding model (same as above) → if null, return `[]`
  2. `embed({ model, value: message })` → `{ embedding, usage }`
  3. If `isServerSide`: record usage
  4. `repo.search(clientId, embedding, topK)` → return chunk texts

  `removeFile`, `removeAllFiles`, `renameFile` → delegate directly to repo.

- [ ] **Run tests — expect pass**

  ```bash
  cd apps/api && bun test src/modules/rag/rag.service.test.ts
  ```

- [ ] **Commit**

  ```bash
  git commit -m "feat(rag): implement RAG service with embedding, chunking, retrieval, and billing"
  ```

---

## Task 9: RAG — Wire Module

**Files:**
- Create: `apps/api/src/modules/rag/index.ts`

- [ ] **Implement `rag/index.ts`**

  Create a `new S3Client(...)` using the same env config as `files/index.ts` (same env vars, separate instance — no circular dep).
  Create `new ProviderConfigRepository(db)` (independent instance — stateless, no side effects from having two).
  Create `new RagRepository(db)`.
  Create `ragService = new RagService(ragRepo, providerConfigRepo, s3, { model: config.DEFAULT_EMBEDDING_MODEL, apiKey: config.DEFAULT_LLM_API_KEY, baseUrl: config.DEFAULT_LLM_BASE_URL })`.
  Export `ragService`.

- [ ] **Commit**

  ```bash
  git commit -m "feat(rag): wire RAG module singleton"
  ```

---

## Task 10: Provider Config — embeddingModel Passthrough + RAG Hooks

**Files:**
- Modify: `apps/api/src/modules/provider-config/provider-config.service.ts`
- Modify: `apps/api/src/modules/provider-config/provider-config.repository.ts`
- Modify: `apps/api/src/modules/provider-config/provider-config.routes.ts`

- [ ] **Update `provider-config.repository.ts`**

  Add `embeddingModel?: string | null` to `ProviderConfigUpsert`. Include it in the `insert` values and `onConflictDoUpdate` set.

- [ ] **Update `provider-config.service.ts`**

  Add `embeddingModel?: string` to `UpsertInput`. Thread it to `repo.upsert(...)`. Include `embeddingModel` in the returned object from both `getConfig` and `upsertConfig`.

- [ ] **Update `provider-config.routes.ts`**

  In the PUT handler, extract `embeddingModel` from body (it's optional in the schema) and pass to `providerConfigService.upsertConfig(...)`.

  After the upsert response is ready, fire-and-forget a re-index: call `ragService.removeAllFiles(clientId)`, then list all client files with `filesService.list(`${clientId}/`)` recursively (write a small `listAllFiles(service, prefix): Promise<string[]>` helper inline that recurses into subdirectories), then call `ragService.indexFile(clientId, relPath)` for each. Errors should be caught and logged via `c.get("logger")`.

  In the DELETE handler, after `providerConfigService.deleteConfig(...)`, fire-and-forget `ragService.removeAllFiles(clientId)`.

  Import `ragService` from `"../rag/index"` and `filesService` from `"../files/index"` at the top of the file.

- [ ] **Type-check**

  ```bash
  cd apps/api && bun run type-check
  ```

- [ ] **Commit**

  ```bash
  git commit -m "feat(provider-config): thread embeddingModel; trigger RAG re-index on config change"
  ```

---

## Task 11: Files Routes — RAG Hooks

**Files:**
- Modify: `apps/api/src/modules/files/files.routes.ts`
- Modify: `apps/api/src/modules/files/index.ts`

- [ ] **Update `createFilesRouter` factory signature**

  Add a second optional parameter: `ragService?: Pick<RagService, "indexFile" | "removeFile" | "renameFile">`. Import the `RagService` type (type-only import).

- [ ] **Upload handler** (`POST /`)

  After the successful `service.upload(...)` call, fire-and-forget `ragService?.indexFile(clientId, relativePath(clientId, key)).catch(...)`. Log errors with the request logger.

- [ ] **Delete handler** (`DELETE /`)

  After `service.delete(key)`, if the key does not end with `/` (skip directory markers), fire-and-forget `ragService?.removeFile(clientId, relativePath(clientId, key)).catch(...)`.

- [ ] **Move handler** (`POST /move`)

  After `service.move(fromKey, toKey)`, fire-and-forget `ragService?.renameFile(clientId, relativePath(clientId, fromKey), relativePath(clientId, toKey)).catch(...)`.

- [ ] **Update `files/index.ts`**

  Import `ragService` from `"../rag/index"`. Pass it as the second argument to `createFilesRouter(filesService, ragService)`.

- [ ] **Type-check**

  ```bash
  cd apps/api && bun run type-check
  ```

- [ ] **Commit**

  ```bash
  git commit -m "feat(files): trigger RAG indexing on file mutations"
  ```

---

## Task 12: Widget — RAG Pre-Retrieval

**Files:**
- Modify: `apps/api/src/modules/widget/widget.service.ts`
- Modify: `apps/api/src/modules/widget/index.ts`

- [ ] **Add `ragService` to `WidgetServiceDeps`**

  Add `ragService?: Pick<RagService, "retrieve">` to the `WidgetServiceDeps` type. Store it as a private field. Import `RagService` as type-only.

- [ ] **Update `sendMessage` in `widget.service.ts`**

  After `resolveProvider` and building `contextParts`, call `this.ragService?.retrieve(clientId, content)` and await it. If it returns chunks (non-empty), append `\n\n<context>\n${chunks.join("\n")}\n</context>` to the `context` string. If `ragService` is not injected or retrieve returns `[]`, context is unchanged.

  Wrap the retrieve call in try/catch — on error, log and proceed without RAG context (graceful degradation).

- [ ] **Update `widget/index.ts`**

  Import `ragService` from `"../rag/index"`. Pass `ragService` in the `WidgetService` constructor deps object.

- [ ] **Run existing widget service tests — expect no regressions**

  ```bash
  cd apps/api && bun test src/modules/widget/widget.service.test.ts
  ```

  The existing tests do not pass `ragService`, so `ragService` is undefined — retrieve is never called. All existing assertions should pass unchanged.

- [ ] **Commit**

  ```bash
  git commit -m "feat(widget): inject RAG context into system prompt before streaming"
  ```

---

## Task 13: Web — Provider Config Form + i18n

**Files:**
- Modify: `apps/web/src/schemas/provider-config.ts`
- Modify: `apps/web/src/api/hooks/useProviderConfig.ts`
- Modify: `apps/web/src/components/settings/ProviderConfigTab.tsx`
- Modify: `apps/web/public/locales/en/translation.json`
- Modify: `apps/web/public/locales/cs/translation.json`
- Modify: `apps/web/public/locales/zh/translation.json`

- [ ] **Update `schemas/provider-config.ts`**

  Add `embeddingModel: z.string().trim().max(255).optional()` to the form schema. No required validation — it is always optional in the form (the API route handles the openai_compatible requirement server-side).

- [ ] **Update `useProviderConfig.ts`**

  The `ProviderConfigResponse` type (inferred from the API response) must include `embeddingModel: string | null`. Update the type manually or re-generate the OpenAPI types (`bun run generate-api` in `apps/web`).

- [ ] **Add i18n keys to all three locale files**

  Add under `settings.provider`:
  ```json
  "embeddingModel": "Embedding Model",
  "embeddingModelPlaceholder": "Leave blank to use provider default",
  "embeddingModelDescription": "Used for RAG indexing and retrieval. Defaults vary by provider."
  ```
  Add Czech and Chinese translations accordingly.

- [ ] **Update `ProviderConfigTab.tsx`**

  In `ProviderConfigForm`: add `embeddingModel: config?.embeddingModel ?? ""` to `defaultValues`. Add a `FormField` for `embeddingModel` rendered when `providerType !== "anthropic"`. For `openai`, show placeholder `"text-embedding-3-small (default)"`. For `google`, show `"text-embedding-004 (default)"`. For `openai_compatible`, show no default hint. Include `embeddingModel` in the `payload` sent via `upsert.mutateAsync(payload)`.

  In `ActiveProviderState`: add a `embeddingModel` row to the `<dl>` display (only when `config.embeddingModel` is non-null).

- [ ] **Verify no TypeScript errors**

  ```bash
  cd apps/web && bun run type-check
  ```

- [ ] **Commit**

  ```bash
  git commit -m "feat(web): add embeddingModel field to provider config form"
  ```

---

## Task 14: Full Integration Check

- [ ] **Run full feedback loop**

  ```bash
  bun run check --write --unsafe
  bun run type-check
  bun run test
  ```

  Fix any lint or type errors. All existing tests must pass. The new `rag.chunking.test.ts` and `rag.service.test.ts` must pass.

- [ ] **Verify API starts without errors**

  ```bash
  cd apps/api && bun run dev
  ```

  Check that the API starts and `/health` returns 200. No startup crashes from the new Zod env schema validation (i.e., `DEFAULT_EMBEDDING_MODEL` is truly optional).

- [ ] **Commit any fixes**

  ```bash
  git commit -m "fix(rag): address integration feedback loop issues"
  ```

---

## Dependency Order

```
Task 1 (schema) → Task 2 (migration) → Task 3 (DTOs)
Task 3 + Task 4 (shared + config) → Task 5 (chunking)
Task 4 → Task 6 (embedding factory)
Task 5 + Task 6 → Task 7 (repository)
Task 7 → Task 8 (service)
Task 8 → Task 9 (wire)
Task 9 → Task 10 (provider config hooks) | Task 11 (files hooks) | Task 12 (widget)
Task 10 + Task 11 + Task 12 → Task 13 (web)
Task 13 → Task 14 (integration check)
```
