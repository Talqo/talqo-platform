# Backoffice MCP Server Management — Design Spec

**Date:** 2026-05-10
**Branch:** SCRUM-122

## Summary

Add a backoffice page for admins to manage pre-made MCP servers (HTTP and stdio transport). Remove SSE transport support entirely. Clients see pre-made servers in their dashboard by name/description and can enable/disable them, but cannot modify config.

---

## Section 1: DB Schema

Add two columns to `pre_made_mcp_servers`:

| Column | Type | Constraint |
|--------|------|-----------|
| `name` | text | NOT NULL |
| `description` | text | nullable |

One new Drizzle migration. The existing `mcpConfig` JSONB column is unchanged — it holds the raw transport config.

---

## Section 2: SSE Removal

Remove all SSE transport code. No backwards compatibility.

### `packages/shared`
- `src/validators/mcp.ts`: delete `mcpSseConfigSchema`; `mcpRemoteServerConfigSchema` becomes HTTP-only; `mcpServerConfigSchema` becomes `stdio | HTTP` discriminated union
- `src/types/agent.ts`: delete `McpSseConfig`; `McpServerConfig` union becomes `McpStdioConfig | McpHttpConfig`

### `apps/api`
- `src/modules/agent/agent.mcp.ts`: remove the `sse` case from `createTransport()`

### `apps/web`
- `src/components/mcp/CustomServerDialog.tsx`: remove SSE option from transport type selector
- `src/schemas/mcp.ts`: update form schema — no SSE variant

Generated OpenAPI types auto-update on next build.

---

## Section 3: Shared & API Layer

### `packages/shared` — validators
- `adminMcpConfigBodySchema`: add `name` (required string) and `description` (optional string)

### `packages/db` — DTOs
- `src/dto/mcp.dto.ts` — `preMadeServerResponseSchema`: add `name` and `description` fields; update inferred `PreMadeServerResponse` type

### `apps/api` — MCP module
- `mcp.repository.ts`: include `name`/`description` in all selects, inserts, and updates for `pre_made_mcp_servers`
- `mcp.routes.ts`: validate `name`/`description` in POST/PATCH admin routes via updated schema
- `src/db/seed.ts`: add `name` and `description` to both seeded pre-made servers

No new API routes — admin CRUD already exists at `/admin/mcp/pre-made`.

---

## Section 4: Backoffice UI

### Sidebar nav
File: `apps/web/src/components/layout/BackofficeLayout.tsx`
- Add entry to `navItems`: `{ icon: Server, label: t("backoffice.nav.mcpServers"), href: "/backoffice/mcp" }`

### New route
File: `apps/web/src/routes/backoffice.mcp.tsx` → `/backoffice/mcp`

Structure mirrors other backoffice pages:
- Page header (title + description)
- `Card` with `CardHeader` (title + "Add Server" button) and `CardContent` containing `McpServersTable`
- `McpServerDialog` mounted at page level, opened from the create button or table edit action

### New component: `McpServersTable`
File: `apps/web/src/components/backoffice/McpServersTable.tsx`

Follows `TenantsTable` pattern — plain `<table>` in a `Card`:
- Columns: Name, Description, Type badge (`HTTP` | `stdio`), Actions (Edit button, Delete button)
- Loading state: spinner in colspan row
- Empty state: "No servers configured" message
- Delete: confirmation via `AlertDialog` before calling delete mutation

### New component: `McpServerDialog`
File: `apps/web/src/components/backoffice/McpServerDialog.tsx`

Single dialog used for both create and edit (title and submit label differ):
- **Always shown:** Name (required text), Description (optional text), Transport type selector (`HTTP` | `stdio`)
- **HTTP fields:** URL (HTTPS, validated), Headers (optional key-value pair list)
- **stdio fields:** Command (required text), Args (optional string array), Env (optional key-value pair list)
- Form validation via Zod + react-hook-form, same pattern as `CustomServerDialog`

### i18n
New translation keys under `backoffice.mcp.*` namespace in all locale files.

---

## Section 5: Client Dashboard UI

File: `apps/web/src/routes/_authenticated/dashboard.tools.tsx`

Update pre-made server display to show `name` and `description` (from updated API response) instead of raw config fields. Type badge (`HTTP` | `stdio`) and enable/disable toggle are unchanged.

---

## Out of Scope

- Client-facing display of stdio config details (hidden by design)
- Admin assigning specific servers to specific clients (clients self-serve via toggle)
- Any migration of existing SSE-configured servers (no backwards compat required)
