# Wide Event Logging

Every HTTP request emits a single structured JSON log line (`message: "wide_event"`) after the response is sent. This is a [wide event](https://charity.wtf/2019/02/05/logs-vs-structured-events/) — one blob per request that accumulates context from middleware and handlers, making it easy to correlate all activity for a given request without joining multiple log lines.

## How it works

1. `wideEventMiddleware` runs early in the global middleware stack (after request ID assignment, before route handlers).
2. It initialises the event with base HTTP and deployment fields and stores it on the Hono context as `wideEvent`.
3. Route handlers can enrich the event by mutating `c.get("wideEvent")`:
   ```ts
   const wideEvent = c.get("wideEvent")
   wideEvent.widget = { session_id: session.id, is_new_session: isNew }
   ```
4. After the handler returns (or throws), the middleware appends outcome fields and emits the event via the structured logger.

The output is NDJSON on stdout, consistent with all other log output.

## Base fields (always present)

| Field | Type | Source | Description |
|---|---|---|---|
| `request_id` | `string` | `crypto.randomUUID()` | UUID assigned at request start; ties all log lines for one request |
| `timestamp` | `string` | `new Date().toISOString()` | ISO-8601 time at middleware entry (request start) |
| `method` | `string` | `c.req.method` | HTTP method |
| `path` | `string` | `c.req.path` | URL path without query string |
| `service` | `string \| undefined` | `SERVICE_NAME` env var | Service identifier |
| `version` | `string \| undefined` | `SERVICE_VERSION` env var | Deployed version / git SHA |
| `deployment_id` | `string \| undefined` | `DEPLOYMENT_ID` env var | CI build or deployment ID |
| `region` | `string \| undefined` | `REGION` env var | Cloud region |
| `status_code` | `number` | `c.res.status` | HTTP response status code |
| `outcome` | `"success" \| "error"` | middleware | `"error"` only when the handler throws an unhandled error |
| `duration_ms` | `number` | `Date.now() - start` | Total request duration in milliseconds |

### Error fields (only when `outcome = "error"`)

| Field | Type | Description |
|---|---|---|
| `error.type` | `string` | Error class name (e.g. `NotFoundError`, `UnauthorizedError`) |
| `error.message` | `string` | Error message |
| `error.code` | `unknown` | App-level error code from `AppError` subclasses |
| `error.retriable` | `boolean` | Whether the client can safely retry |

## Environment variables

All four deployment metadata vars are optional. Omit them in local dev; set them in production/staging.

| Variable | Example | Description |
|---|---|---|
| `SERVICE_NAME` | `pagepal-api` | Human-readable service name |
| `SERVICE_VERSION` | `v1.4.2` or git SHA | Deployed version |
| `DEPLOYMENT_ID` | `deploy-789` | CI pipeline run or deployment ID |
| `REGION` | `eu-central-1` | Cloud region |

## Domain context namespaces

The event type (`WideEvent` in `apps/api/src/common/wide-event.types.ts`) uses named namespaces for domain context. All namespaces are optional — only present on routes where they apply.

### `auth` — authentication endpoints

Set on login / register handlers.

| Field | Type | Value |
|---|---|---|
| `auth.outcome` | `"registered" \| "logged_in" \| "invalid_credentials"` | Result of the auth attempt |

### `client` — authenticated client routes (`/v1/client/*`, `/v1/widget/*`)

Set by `clientAuth` middleware.

| Field | Type | Value |
|---|---|---|
| `client.id` | `string` | Client UUID |
| `client.status` | `"active" \| "suspended"` | Account status at time of request |
| `client.is_impersonated` | `true \| undefined` | Present when the request uses an admin impersonation token |

### `admin` — admin routes (`/v1/admin/*`)

`admin.id` set by `adminAuth` middleware. Other fields set by individual route handlers.

| Field | Type | Value |
|---|---|---|
| `admin.id` | `string` | Admin UUID |
| `admin.target_client_id` | `string \| undefined` | Client acted on (status change, impersonation) |
| `admin.action` | `"suspend" \| "enable" \| "impersonate" \| undefined` | Action taken |

### `widget` — widget routes (`/v1/widget/*`)

| Endpoint | Fields set |
|---|---|
| `POST /widget/sessions` | `widget.session_id`, `widget.is_new_session` |
| `POST /widget/sessions/:id/conversations` | `widget.session_id`, `widget.conversation_id` |
| `GET /widget/.../messages` | `widget.session_id`, `widget.conversation_id` |
| `POST /widget/.../messages` | `widget.session_id`, `widget.conversation_id` |

### `ai` — AI provider context

Set before the SSE stream starts on `POST /widget/.../messages`.

| Field | Type | Value |
|---|---|---|
| `ai.provider` | `string` | Provider type (e.g. `"openai"`, `"anthropic"`) |
| `ai.model` | `string` | Model identifier (e.g. `"gpt-4o"`) |

**Token counts** are only available after the SSE stream completes, which is after the wide event is emitted. They are logged as a separate `ai_usage` log line correlated via `request_id`:

```json
{
  "message": "ai_usage",
  "request_id": "...",
  "conversation_id": "...",
  "prompt_tokens": 412,
  "completion_tokens": 89,
  "total_tokens": 501
}
```

### `file` — file operations (`/v1/client/me/files`)

Not yet wired in route handlers. Type is defined in `WideEvent` — add enrichment when implementing file routes.

| Field | Type | Value |
|---|---|---|
| `file.path` | `string \| undefined` | File path (upload / delete) |
| `file.size_bytes` | `number \| undefined` | File size (upload) |
| `file.from_path` | `string \| undefined` | Source path (move) |
| `file.to_path` | `string \| undefined` | Destination path (move) |

## Adding an exporter (OpenTelemetry / Sentry)

The middleware is a factory (`apps/api/src/common/middleware/wide-event.ts`):

```ts
export function createWideEventMiddleware(exporters: EventExporter[] = [])
```

Each exporter implements `{ export(event: WideEvent): void }` from `apps/api/src/common/wide-event.types.ts`. Register exporters in `apps/api/src/app.ts`:

```ts
import { createWideEventMiddleware } from "./common/middleware/wide-event"
import { otelExporter } from "./common/exporters/otel"

app.use("/*", createWideEventMiddleware([otelExporter]))
```

The default `wideEventMiddleware` export uses no extra exporters (console only via the structured logger).
