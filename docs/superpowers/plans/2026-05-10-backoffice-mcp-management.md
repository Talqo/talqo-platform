# Backoffice MCP Server Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a backoffice page for admins to manage pre-made MCP servers (HTTP and stdio), remove SSE transport everywhere, and surface name/description in both the admin UI and the client dashboard.

**Architecture:** SSE is deleted first (no backwards compat) to keep the shared validators clean before new fields are added. DB migration runs next, then the API layer consumes the updated schema, then the web layer is built on top.

**Tech Stack:** Bun, Drizzle ORM, Hono, Zod, React, TanStack Router, TanStack Query, react-hook-form, shadcn/ui, i18next

**Spec:** `docs/superpowers/specs/2026-05-10-backoffice-mcp-management-design.md`

---

## File Map

### Modified
- `packages/shared/src/validators/mcp.ts` — remove SSE schema; add `name`/`description` to admin body schema
- `packages/shared/src/types/agent.ts` — remove `McpSseConfig`; update `McpServerConfig` union
- `packages/db/src/schema/mcp.ts` — add `name` and `description` columns
- `packages/db/src/dto/mcp.dto.ts` — add `name`/`description` to `preMadeServerResponseSchema`
- `apps/api/src/modules/mcp/mcp.repository.ts` — include `name`/`description` in all queries
- `apps/api/src/modules/mcp/mcp.routes.ts` — validate `name`/`description` in admin POST/PATCH
- `apps/api/src/modules/agent/agent.mcp.ts` — remove SSE case from `createTransport()`
- `apps/api/src/modules/agent/agent.mcp.test.ts` — remove SSE-specific test cases
- `apps/api/src/db/seed.ts` — add `name`/`description` to seeded pre-made servers
- `apps/web/src/components/mcp/CustomServerDialog.tsx` — remove SSE option
- `apps/web/src/schemas/mcp.ts` — remove SSE from form schema
- `apps/web/src/components/layout/BackofficeLayout.tsx` — add MCP nav item
- `apps/web/src/routes/_authenticated/dashboard.tools.tsx` — show name/description for pre-made servers
- `apps/web/public/locales/en/translation.json` — add `backoffice.mcp.*` keys
- `apps/web/public/locales/cs/translation.json` — add `backoffice.mcp.*` keys
- `apps/web/public/locales/zh/translation.json` — add `backoffice.mcp.*` keys

### Created
- `apps/web/src/routes/backoffice.mcp.tsx` — backoffice MCP management page
- `apps/web/src/components/backoffice/McpServersTable.tsx` — admin table of pre-made servers
- `apps/web/src/components/backoffice/McpServerDialog.tsx` — create/edit dialog

---

## Task 1: Remove SSE from shared validators and types

**Files:**
- Modify: `packages/shared/src/validators/mcp.ts`
- Modify: `packages/shared/src/types/agent.ts`

- [ ] In `validators/mcp.ts`: delete `mcpSseConfigSchema` and its export. Update `mcpRemoteServerConfigSchema` (used by clients) to be HTTP-only — remove SSE from the discriminated union. Update `mcpServerConfigSchema` (used by admins) to `stdio | HTTP` only.
- [ ] In `types/agent.ts`: delete `McpSseConfig` type and remove it from the `McpServerConfig` union.
- [ ] Build the shared package to confirm no errors: `cd packages/shared && bun run build`
- [ ] Commit: `chore(shared): remove SSE transport type and schema`

---

## Task 2: Remove SSE from API transport layer

**Files:**
- Modify: `apps/api/src/modules/agent/agent.mcp.ts`
- Modify: `apps/api/src/modules/agent/agent.mcp.test.ts`

- [ ] In `agent.mcp.ts`: delete the `sse` branch from the `createTransport()` switch/if block. The function now only handles `stdio` and `http`.
- [ ] In `agent.mcp.test.ts`: delete any test cases that construct or assert on SSE transports.
- [ ] Run the agent tests: `cd apps/api && bun test src/modules/agent/agent.mcp.test.ts`
- [ ] Run type-check: `cd apps/api && bun run type-check`
- [ ] Commit: `chore(api): remove SSE transport from MCP agent module`

---

## Task 3: Remove SSE from web client form

**Files:**
- Modify: `apps/web/src/components/mcp/CustomServerDialog.tsx`
- Modify: `apps/web/src/schemas/mcp.ts`

- [ ] In `schemas/mcp.ts`: update the frontend form schema to remove the SSE variant, mirroring the updated `mcpRemoteServerConfigSchema` from shared (HTTP only).
- [ ] In `CustomServerDialog.tsx`: remove the SSE radio/tab option from the transport type selector. Remove any SSE-specific form fields. The dialog now only renders HTTP fields.
- [ ] Run type-check: `cd apps/web && bun run type-check`
- [ ] Commit: `chore(web): remove SSE option from custom MCP server form`

---

## Task 4: DB schema — add name and description

**Files:**
- Modify: `packages/db/src/schema/mcp.ts`

- [ ] In the `preMadeMcpServers` Drizzle table definition, add:
  - `name`: `text("name").notNull()`
  - `description`: `text("description")` (nullable, no `.notNull()`)
- [ ] Generate the migration: `cd packages/db && bun run db:generate`
- [ ] Verify the generated SQL file in `packages/db/drizzle/` adds the two columns correctly.
- [ ] Commit: `chore(db): add name and description to pre_made_mcp_servers`

---

## Task 5: Update DTOs and shared admin validator

**Files:**
- Modify: `packages/db/src/dto/mcp.dto.ts`
- Modify: `packages/shared/src/validators/mcp.ts`

- [ ] In `mcp.dto.ts`: add `name: z.string()` and `description: z.string().nullable()` to `preMadeServerResponseSchema`. The inferred `PreMadeServerResponse` type updates automatically.
- [ ] In `validators/mcp.ts`: add `name: z.string().min(1)` and `description: z.string().optional()` to `adminMcpConfigBodySchema`.
- [ ] Build both packages: `cd packages/db && bun run build`, `cd packages/shared && bun run build`
- [ ] Commit: `feat(shared,db): add name and description to pre-made MCP server schemas`

---

## Task 6: Update API MCP module

**Files:**
- Modify: `apps/api/src/modules/mcp/mcp.repository.ts`
- Modify: `apps/api/src/modules/mcp/mcp.routes.ts`
- Modify: `apps/api/src/db/seed.ts`

- [ ] In `mcp.repository.ts`: include `name` and `description` in all select columns for `pre_made_mcp_servers`. Include them in insert values for `createPreMadeServer()` and update values for `updatePreMadeServer()`.
- [ ] In `mcp.routes.ts`: the admin POST and PATCH routes already use `adminMcpConfigBodySchema` for validation — confirm the updated schema flows through correctly. No new routes needed.
- [ ] In `seed.ts`: add `name` and `description` to both seeded pre-made MCP server objects.
- [ ] Run type-check: `cd apps/api && bun run type-check`
- [ ] Commit: `feat(api): propagate name and description through MCP repository and routes`

---

## Task 7: Regenerate OpenAPI types

- [ ] Start the API (ensure DB is running): `cd apps/api && bun run dev` (in background)
- [ ] Regenerate types: `cd apps/web && bun run generate-api`
- [ ] Verify `apps/web/src/api/generated/openapi.d.ts` now includes `name` and `description` in pre-made server response and request schemas.
- [ ] Stop the API server.
- [ ] Commit: `chore(web): regenerate OpenAPI types after MCP schema changes`

---

## Task 8: Build McpServerDialog

**Files:**
- Create: `apps/web/src/components/backoffice/McpServerDialog.tsx`

This is a single dialog used for both create and edit. Reference `CustomServerDialog.tsx` for the form pattern (react-hook-form + Zod).

- [ ] Create the component. Props: `open`, `onOpenChange`, `onSubmit`, and optionally `initialValues` (populated when editing).
- [ ] Form fields — always shown: `name` (text, required), `description` (text, optional), transport type selector (`HTTP` | `stdio`).
- [ ] HTTP conditional fields: `url` (HTTPS validated), `headers` (key-value list, optional).
- [ ] stdio conditional fields: `command` (text, required), `args` (string array, optional), `env` (key-value list, optional).
- [ ] Dialog title and submit button label change based on whether `initialValues` is provided (`"Add Server"` vs `"Edit Server"`).
- [ ] Validate with `adminMcpConfigBodySchema` from `packages/shared`.
- [ ] Run type-check: `cd apps/web && bun run type-check`
- [ ] Commit: `feat(web): add McpServerDialog for backoffice MCP management`

---

## Task 9: Build McpServersTable

**Files:**
- Create: `apps/web/src/components/backoffice/McpServersTable.tsx`

Reference `TenantsTable.tsx` for the table pattern (plain `<table>` inside a `Card`).

- [ ] Create the component. Props: `servers` (array of `PreMadeServerResponse` or undefined for loading), `onEdit(server)`, `onDelete(server)`, `pendingId` (optional, disables row actions while a mutation is in flight).
- [ ] Columns: Name, Description, Type badge (`HTTP` or `stdio`, derived from `server.mcpConfig.type`), Actions (Edit button, Delete button).
- [ ] Loading state: spinner in a `colspan` row.
- [ ] Empty state: "No servers configured" text row.
- [ ] Delete does not confirm inline — calls `onDelete` and lets the parent handle the `AlertDialog`.
- [ ] Run type-check: `cd apps/web && bun run type-check`
- [ ] Commit: `feat(web): add McpServersTable for backoffice MCP management`

---

## Task 10: Build backoffice MCP route and add nav item

**Files:**
- Create: `apps/web/src/routes/backoffice.mcp.tsx`
- Modify: `apps/web/src/components/layout/BackofficeLayout.tsx`

- [ ] In `BackofficeLayout.tsx`: add an entry to the `navItems` array — `{ icon: Server, label: t("backoffice.nav.mcpServers"), href: "/backoffice/mcp" }`. Import `Server` from `lucide-react`.
- [ ] Create `backoffice.mcp.tsx`. Follow the pattern of `backoffice.index.tsx`:
  - Use `useAdminPreMadeServers`, `useAdminCreatePreMadeServer`, `useAdminUpdatePreMadeServer`, `useAdminDeletePreMadeServer` from `useAdmin.ts` (these hooks already exist).
  - Page header with title and description.
  - `Card` with `CardHeader` (title + "Add Server" `Button`) and `CardContent` containing `McpServersTable`.
  - `McpServerDialog` mounted at page level; toggled open from the "Add Server" button and from `McpServersTable`'s `onEdit` callback.
  - `AlertDialog` for delete confirmation, same pattern as the tenant suspend dialog.
- [ ] Register the route in TanStack Router — file name `backoffice.mcp.tsx` in the routes directory is picked up automatically by the file-based router. Run `bun run generate-routes` if needed.
- [ ] Run type-check: `cd apps/web && bun run type-check`
- [ ] Commit: `feat(web): add backoffice MCP servers management page`

---

## Task 11: Update client dashboard to show name and description

**Files:**
- Modify: `apps/web/src/routes/_authenticated/dashboard.tools.tsx`

- [ ] In the pre-made servers section, replace the display of raw config fields (URL, type badge derived from config) with the server's `name` and `description`. Keep the type badge and the enable/disable toggle unchanged.
- [ ] Run type-check: `cd apps/web && bun run type-check`
- [ ] Commit: `feat(web): show name and description for pre-made MCP servers in client dashboard`

---

## Task 12: Add i18n keys

**Files:**
- Modify: `apps/web/public/locales/en/translation.json`
- Modify: `apps/web/public/locales/cs/translation.json`
- Modify: `apps/web/public/locales/zh/translation.json`

- [ ] Add the following keys to all three locale files under a `backoffice.mcp` namespace:
  - `nav.mcpServers` — sidebar label ("MCP Servers" / translated)
  - `title` — page heading
  - `description` — page subheading
  - `addServer` — add button label
  - `editServer` — edit dialog title
  - `noServers` — empty table message
  - `deleteConfirmTitle`, `deleteConfirmDescription` — alert dialog copy
  - Form field labels: `name`, `description`, `transportType`, `url`, `headers`, `command`, `args`, `env`
- [ ] Commit: `feat(web): add i18n keys for backoffice MCP server management`

---

## Task 13: Final verification

- [ ] Run linter across the monorepo: `bun run check --write --unsafe`
- [ ] Run type-check across the monorepo: `bun run type-check`
- [ ] Run all API tests: `cd apps/api && bun test`
- [ ] Run the full app manually: start the API and web dev server, log in as admin, verify the MCP Servers nav item appears, create an HTTP server, create a stdio server, edit each, delete one.
- [ ] Log in as a client, navigate to `/dashboard/tools`, verify pre-made servers show name + description and the enable/disable toggle works.
- [ ] Verify no SSE option appears anywhere in the UI.
- [ ] Commit any lint fixes: `chore: lint fixes after MCP management feature`
