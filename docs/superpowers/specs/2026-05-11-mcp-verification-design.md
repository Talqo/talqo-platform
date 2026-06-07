# MCP Verification & Headers Fix — Design

## Overview

Three related improvements to MCP server management:

1. **Verify endpoint** — API checks connectivity and returns available tools
2. **Status UI** — Green/red badge per server, progressive on page load; expandable row shows tools or error
3. **Client headers fix** — `CustomMcpDialog` gains header management (already supported by API schema, missing from UI)
4. **Rename cleanup** — Remove misleading "server" from file/type names; use explicit "Mcp" naming

---

## Scope

| Location | Change |
|---|---|
| `agent.mcp.ts` | Add `verifyMcpServer(config)` |
| `mcp.routes.ts` | Add two verify endpoints |
| `schemas/mcp.ts` | New client form schema with headers; rename types |
| `CustomMcpDialog.tsx` (renamed) | Add headers field array |
| `McpDialog.tsx` (renamed) | No behavior change — rename only |
| `McpTable.tsx` (renamed) | Add status badge column + expandable row |
| `dashboard.tools.tsx` | Add status badge + expandable row for both server types |
| `useMcp.ts` / `useAdmin.ts` | Add `useVerifyMcp` hook |

---

## Section 1: API — Verify Endpoints

### New endpoints

```
POST /admin/mcp/verify      ← adminAuth
POST /client/me/mcp/verify  ← clientAuth
```

**Admin request body** — new `adminMcpVerifyBodySchema = z.object({ mcpConfig: mcpServerConfigSchema })` (http or stdio; excludes name/description which `adminMcpConfigBodySchema` requires but verify does not need):
```json
{ "mcpConfig": { "type": "http", "url": "https://..." } }
{ "mcpConfig": { "type": "stdio", "command": "npx", "args": ["..."] } }
```

**Client request body** — reuses existing `mcpConfigBodySchema` (already `z.object({ mcpConfig: mcpRemoteServerConfigSchema })`; http only):
```json
{ "mcpConfig": { "type": "http", "url": "https://..." } }
```

**Response** — HTTP 200 always (verification failure is not an HTTP error):
```ts
{ ok: true,  tools: string[] }
{ ok: false, error: string  }
```

### `verifyMcpServer` in `agent.mcp.ts`

New exported function, reuses existing `createTransport`:

```ts
export async function verifyMcpServer(
  config: McpServerConfig,
): Promise<{ ok: true; tools: string[] } | { ok: false; error: string }> {
  try {
    const client = await createMCPClient({ transport: createTransport(config) })
    const toolSet = await client.tools()
    await client.close()
    return { ok: true, tools: Object.keys(toolSet) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
```

Both route handlers call `verifyMcpServer` directly. No changes to `mcp.service.ts` — this is a stateless utility, not a data operation.

### Why HTTP 200 always

Verification failure (e.g. MCP server unreachable) is an expected runtime state, not an API error. Returning 4xx/5xx would cause TanStack Query to retry and treat it as a fetch failure rather than a result to display.

---

## Section 2: Client Headers Fix

### Problem

`CustomMcpDialog` (currently `CustomServerDialog`) drops headers entirely:
- `toFormValues` ignores them
- Form has no UI for them
- `toMcpConfig` preserves existing headers but never lets user set new ones

The API already accepts headers on `mcpConfigBodySchema` — this is purely a frontend gap.

### Fix

**`schemas/mcp.ts`** — replace the alias with an explicit client form schema:

```ts
// Before
export const mcpServerConfigSchema = mcpRemoteServerConfigSchema
export type McpServerConfigFormValues = McpRemoteServerConfig

// After
export const mcpConfigFormSchema = z.object({
  type: z.literal("http"),
  url: mcpUrlField,
  headers: z.array(kvPairSchema).optional(),
})
export type McpConfigFormValues = z.infer<typeof mcpConfigFormSchema>
```

**`CustomMcpDialog.tsx`** — add `useFieldArray` for headers + UI matching the backoffice headers section. `toFormValues` maps `Record<string,string>` → `KvPair[]`. `toMcpConfig` maps back via the same `kvPairsToRecord` pattern used in `McpDialog`.

Extract `kvPairsToRecord` and `recordToKvPairs` to `src/lib/mcp-utils.ts` — used by both `CustomMcpDialog` and `McpDialog`.

---

## Section 3: Verification Hook

### One shared hook

New file `src/api/hooks/useMcpVerify.ts` — imported by both backoffice and client pages:

```ts
export function useVerifyMcp(
  config: McpServerConfigInput | McpRemoteServerConfig,
  isAdmin: boolean,
) {
  return useQuery({
    queryKey: ["mcp-verify", config],
    queryFn: () => isAdmin
      ? api.post("/admin/mcp/verify", { mcpConfig: config })
      : api.post("/client/me/mcp/verify", { mcpConfig: config }),
    staleTime: 0,   // always re-verify on mount
    retry: false,   // don't retry — connection failure is a result, not a transient error
  })
}
```

- Admin pages pass `isAdmin: true`
- Client pages pass `isAdmin: false`
- Each server row mounts its own hook instance → independent loading states → progressive UX

---

## Section 4: UI — Status Badge + Expandable Row

### `McpStatusBadge` (new component, `components/mcp/McpStatusBadge.tsx`)

Props: `config: McpServerConfigInput | McpRemoteServerConfig, isAdmin: boolean`

States:
- `loading` — spinner
- `ok: true` — green "Ready" badge
- `ok: false` — red "Error" badge

No click handler on the badge itself — error detail is in the expanded row.

### Expandable row

Row click toggles local `expanded` boolean state. When expanded, renders below the row:
- `ok: true` — list of tool name strings (simple text list or pill badges)
- `ok: false` — `error` string from verify response

Action buttons (edit/delete) call `e.stopPropagation()` to avoid toggling the row.

### Backoffice — `McpTable.tsx` (renamed from `McpServersTable.tsx`)

- Add `McpStatusBadge` as a column
- Row becomes clickable; expanded section shows tools or error

### Client — `dashboard.tools.tsx`

- **Custom servers**: add badge + expandable row (same pattern)
- **Pre-made servers**: badge + expandable row on **enabled** servers only — disabled servers are not active and verification is irrelevant

---

## Rename Map

| Old name | New name |
|---|---|
| `CustomServerDialog.tsx` | `CustomMcpDialog.tsx` |
| `McpServerDialog.tsx` | `McpDialog.tsx` |
| `McpServersTable.tsx` | `McpTable.tsx` |
| `mcpServerConfigSchema` (frontend) | `mcpConfigFormSchema` |
| `McpServerConfigFormValues` | `McpConfigFormValues` |
| `mcpServerDialogSchema` | `mcpDialogSchema` |
| `McpServerDialogFormValues` | `McpDialogFormValues` |

All import sites updated. No API or DB renames — these are frontend-only.

---

## Data Flow

```
Page mounts
  └─ per server row: useVerifyMcp(config) fires
       └─ POST /admin/mcp/verify or /client/me/mcp/verify
            └─ verifyMcpServer(config) in agent.mcp.ts
                 └─ createMCPClient → client.tools() → close
                      ├─ success → { ok: true, tools: [...] }
                      └─ error   → { ok: false, error: "..." }
  └─ McpStatusBadge renders per result (progressive)
  └─ Row click → expanded section shows tools list or error string
```

---

## Out of Scope

- Per-tool selection (read-only list only)
- Persisting verification status to DB (live check only)
- Pre-save "test connection" in dialog (endpoints support it, but no UI trigger)
- Stdio restriction change (clients cannot use stdio — enforced at schema level, correct by design)
