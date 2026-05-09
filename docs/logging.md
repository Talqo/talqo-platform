# Wide Event Logging

Every HTTP request emits a single structured JSON log line (`message: "wide_event"`) after the response. One blob per request accumulates context from middleware and handlers, making it easy to correlate all activity via `request_id` without joining multiple log lines ([wide events](https://charity.wtf/2019/02/05/logs-vs-structured-events/)).

Source: [`apps/api/src/common/wide-event.types.ts`](../apps/api/src/common/wide-event.types.ts) · [`apps/api/src/common/middleware/wide-event.ts`](../apps/api/src/common/middleware/wide-event.ts)

## Enriching events

Route handlers and middleware enrich the event by mutating `c.get("wideEvent")`:

```ts
const wideEvent = c.get("wideEvent")
wideEvent.widget = { session_id: session.id, is_new_session: isNew }
```

## Fields

### Base (always present)

| Field | Description |
|---|---|
| `request_id` | UUID per request; ties all log lines together |
| `timestamp` | ISO-8601 request start time |
| `method`, `path` | HTTP method and URL path |
| `status_code` | Response status code |
| `outcome` | `"success"` or `"error"` |
| `duration_ms` | Total request time in ms |
| `service`, `version`, `deployment_id`, `region` | Optional deployment metadata from env vars |

When `outcome = "error"` an `error` object is appended with `type`, `message`, `code`, and `retriable`.

### Domain namespaces

All namespaces are optional — only present on routes where they apply. See `WideEvent` in [`apps/api/src/common/wide-event.types.ts`](../apps/api/src/common/wide-event.types.ts) for field shapes.

| Namespace | Set by | Routes |
|---|---|---|
| `auth` | login / register handlers | `/v1/auth/*` |
| `client` | `clientAuth` middleware | `/v1/client/*`, `/v1/widget/*` |
| `admin` | `adminAuth` middleware + handlers | `/v1/admin/*` |
| `widget` | widget route handlers | `/v1/widget/*` |
| `ai` | message handler (before SSE stream) | `POST /v1/widget/.../messages` |

### AI token counts

Token counts are unavailable when the wide event emits — the SSE stream hasn't finished yet. They're logged as a separate line correlated via `request_id`:

```json
{ "message": "ai_usage", "request_id": "...", "conversation_id": "...", "prompt_tokens": 412, "completion_tokens": 89, "total_tokens": 501 }
```

## Adding an exporter

`createWideEventMiddleware` accepts `EventExporter[]` (`{ export(event: WideEvent): void }`). Register in `apps/api/src/app.ts`:

```ts
app.use("/*", createWideEventMiddleware([myExporter]))
```

The default export (`wideEventMiddleware`) uses no extra exporters. Exporter failures are caught and suppressed — they cannot affect the response or mask the original error.
