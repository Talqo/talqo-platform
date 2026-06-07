# Provider Config Design

**Date:** 2026-04-06
**Scope:** Allow clients to bring their own AI provider (OpenAI, OpenAI Compatible, Google Gemini, Anthropic) instead of using the platform default.

---

## Context

The platform hosts its own models as the default. Clients who want to use their own provider and API key can configure one custom provider. If no config exists, the platform default is used. Only one provider is active per client at a time.

Requirements covered: FR-2.6, FR-2.7, NFR-3.1.

---

## Database

New table `ai_provider_configs` — 1:1 with `clients`. No row means the client uses the platform default.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK | |
| `client_id` | uuid | FK → clients, unique, cascade delete | |
| `provider_type` | provider_type_enum | not null | `openai \| openai_compatible \| google \| anthropic` |
| `api_key_encrypted` | text | not null | AES-256-GCM, application-level |
| `model` | varchar | not null | Free text, e.g. `gpt-4o`, `claude-sonnet-4-6` |
| `base_url` | text | nullable | Required only for `openai_compatible` |
| `updated_at` | timestamp | not null | |

The `provider_type` column uses a Postgres enum defined as:

```ts
export const providerTypeEnum = pgEnum('provider_type', [
  'openai',
  'openai_compatible',
  'google',
  'anthropic',
]);
```

> **Note:** Adding a new provider type requires an `ALTER TYPE ... ADD VALUE` migration, which cannot run inside a transaction in Postgres.

The table follows the same convention as `bot_configs`.

---

## Shared Types (`packages/shared`)

Replace the existing flat `AiProviderConfig` type with:

```ts
export type AiProviderConfig = {
  type: 'openai' | 'openai_compatible' | 'google' | 'anthropic';
  apiKey: string;
  model: string;
  baseURL?: string; // required when type === 'openai_compatible'
};
```

This mirrors the Vercel AI SDK constructor shape directly — all four providers accept `apiKey` and `baseURL` with the same field names, so no conversion is needed at the call site.

---

## Module: `provider-config`

Location: `apps/api/src/modules/provider-config/`

```
provider-config/
├── provider-config.routes.ts
├── provider-config.service.ts
├── provider-config.repository.ts
└── index.ts
```

### API Endpoints

All routes are protected by client JWT auth and mounted at `/provider-config`.

| Method | Path | Description |
|---|---|---|
| `GET /` | Get current config | Returns masked config or `null` (platform default) |
| `PUT /` | Upsert config | Create or replace provider config |
| `DELETE /` | Remove config | Deletes config, reverts to platform default |

### GET response shape

```ts
{
  providerType: 'openai' | 'openai_compatible' | 'google' | 'anthropic';
  apiKeyMasked: string; // e.g. "sk-...xxxx" (last 4 chars)
  model: string;
  baseUrl: string | null;
  updatedAt: string;
}
```

The API key is **never returned in full**. The masked hint exists only to confirm a key is set.

### PUT request body

```ts
{
  providerType: 'openai' | 'openai_compatible' | 'google' | 'anthropic';
  apiKey: string;
  model: string;
  baseUrl?: string; // required when providerType === 'openai_compatible'
}
```

Validation enforces `baseUrl` presence when `providerType === 'openai_compatible'` via a Zod discriminated union in the route schema.

> **Naming note:** The API body uses `baseUrl` (REST convention, lowercase `url`). The internal `AiProviderConfig` type uses `baseURL` (capital, matching the Vercel AI SDK). The service layer performs this single-field rename at the API boundary — it is the only conversion in the entire flow.

---

## Encryption

- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Key source:** `PROVIDER_KEY_SECRET` environment variable (32-byte key, represented as 64 hex characters)
- **Storage format:** `<iv_hex>:<authTag_hex>:<ciphertext_hex>` — all in one `text` column
- **Implementation:** `apps/api/src/common/crypto.ts` — two functions: `encrypt(plaintext)` and `decrypt(ciphertext)`
- The secret is loaded from env at startup and validated alongside other config in `config.ts`

The API key is encrypted on `PUT` and decrypted only when building the `AiProviderConfig` for the agent — it is never logged or returned to the client in plaintext.

---

## Agent Provider (`agent.provider.ts`)

Updated to switch on `config.type` and instantiate the matching SDK provider. Fields pass through directly with no remapping:

```ts
switch (config.type) {
  case 'openai':
    return createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL })(config.model);
  case 'openai_compatible':
    return createOpenAICompatible({ name: 'custom', apiKey: config.apiKey, baseURL: config.baseURL! }).chatModel(config.model);
  case 'google':
    return createGoogleGenerativeAI({ apiKey: config.apiKey, baseURL: config.baseURL })(config.model);
  case 'anthropic':
    return createAnthropic({ apiKey: config.apiKey, baseURL: config.baseURL })(config.model);
}
```

---

## Provider Resolution at Message Time

When the widget service sends a message, it must resolve which provider to use before calling the agent:

1. Look up the client's `ai_provider_configs` row
2. If a row exists: decrypt the API key and build `AiProviderConfig` from the row
3. If no row exists: use the platform default (a pre-configured `AiProviderConfig` built from platform env vars)

This resolution happens in the widget service (or a shared helper it calls) — not inside the agent service, which remains provider-agnostic and receives a ready `AiProviderConfig`.

---

## New Dependencies

```
@ai-sdk/openai
@ai-sdk/anthropic
@ai-sdk/google
```

`@ai-sdk/openai-compatible` is already installed.

---

## Form Fields (Client Dashboard)

These are the fields the UI form must provide, conditional on the selected provider:

| Field | Type | Shown when | Notes |
|---|---|---|---|
| Provider | Select | Always | Options: OpenAI, OpenAI Compatible, Google Gemini, Anthropic |
| API Key | Password input | Always | Write-only after save; show masked hint if already set |
| Model | Text input | Always | Placeholder suggestions per provider |
| Base URL | Text input | `openai_compatible` only | Required, e.g. `https://my.host/v1` |

**Model placeholder suggestions by provider:**
- OpenAI: `gpt-4o`, `gpt-4o-mini`
- OpenAI Compatible: *(depends on endpoint)*
- Google Gemini: `gemini-2.0-flash`, `gemini-1.5-pro`
- Anthropic: `claude-sonnet-4-6`, `claude-haiku-4-5`

---

## ERD Update

The `ai_provider_configs` table must be added to `docs/architecture/ERD/main-mermaid.md`:

```
AI_PROVIDER_CONFIG {
  uuid id PK
  uuid client_id FK
  string provider_type
  text api_key_encrypted
  string model
  text base_url
  datetime updated_at
}

CLIENT ||--o| AI_PROVIDER_CONFIG : configures
```
