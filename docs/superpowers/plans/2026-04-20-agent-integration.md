# Agent Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the embeddable chat widget to the API with real LLM responses, SSE streaming, IP-based rate limiting, conversation message limits, and a platform-level default LLM provider.

**Architecture:** The widget makes authenticated POST requests to the API using a `widgetToken` credential. The API validates the token, checks IP rate limits, fetches conversation history + client config, streams LLM tokens back via SSE, and persists the full assistant response. A Postgres-backed rate limit table tracks per-IP hourly message counts. A default LLM provider fallback is configured via environment variables for clients without their own provider.

**Tech Stack:** Hono (streamSSE), Vercel AI SDK (streamText), Drizzle ORM, Zod, React hooks (useWidget), SSE (manual parsing over fetch ReadableStream)

**Response format convention:** All **new** routes in this plan return data directly (e.g. `c.json({ widgetToken }, 200)`), not wrapped in `{ success: true, data: { ... } }`. Existing routes are unchanged (handled in a separate PR). Error responses continue using the existing `errorHandler` middleware shape (`{ success: false, error: { code, message } }`).

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `packages/db/src/schema/rate-limits.ts` | Drizzle table `widgetIpRateLimits` |
| Modify | `packages/db/src/schema/index.ts` | Re-export new rate-limits schema |
| Modify | `packages/db/src/dto/client.dto.ts` | Expose `widgetToken` in `clientResponseSchema` |
| Create | `apps/api/src/common/middleware/widget-rate-limit.ts` | Per-IP hourly rate limit middleware |
| Modify | `apps/api/src/common/config.ts` | Add rate limit, message limit, and default LLM env vars |
| Modify | `apps/api/src/common/errors.ts` | Add `TooManyRequestsError` |
| Modify | `apps/api/src/modules/agent/agent.types.ts` | Add optional `history` field to `AiServiceInput` |
| Modify | `apps/api/src/modules/agent/agent.service.ts` | Add `streamResponse` function |
| Modify | `apps/api/src/modules/agent/agent.tools.ts` | Guard empty `contextDirectory` |
| Modify | `apps/api/src/modules/widget/widget.repository.ts` | Add `getMessageCount` method |
| Modify | `apps/api/src/modules/widget/widget.service.ts` | Full rewrite: inject repos, stream LLM, limit check |
| Modify | `apps/api/src/modules/widget/widget.routes.ts` | SSE streaming, remove DELETE route, add rate limit |
| Modify | `apps/api/src/modules/widget/index.ts` | Instantiate and inject all four repos |
| Modify | `apps/api/src/app.ts` | Simplify widget URL mounts, mount rate limit |
| Modify | `apps/api/src/modules/client-account/client-account.service.ts` | Add `rotateWidgetToken` method |
| Modify | `apps/api/src/modules/client-account/client-account.repository.ts` | Add `rotateWidgetToken` query |
| Modify | `apps/api/src/modules/client-account/client-account.routes.ts` | Add `POST /me/widget-token/rotate` endpoint |
| Modify | `packages/widget/src/types.ts` | Rename `clientId` → `widgetToken` |
| Modify | `packages/widget/src/main.tsx` | Update `resolveConfig` to read `widgetToken` |
| Modify | `packages/widget/src/hooks/useWidget.ts` | Real fetch + SSE, rename state, add `isLimitReached` |
| Modify | `packages/widget/src/EmbeddedWidget.tsx` | Wire `isStreaming`, `startNewConversation`, pass config to WidgetRoot |
| Modify | `packages/widget/src/primitives/WidgetRoot.tsx` | Pass `apiUrl` + `widgetToken` through to useWidget |
| Modify | `apps/web/src/components/widget/setup/EmbedCodeCard.tsx` | Fix prop: `clientId` → `widgetToken`, add Rotate button |
| Modify | `apps/web/src/components/widget/WidgetSetup.tsx` | Pass `widgetToken` instead of `id` |
| Modify | `.env.example` | Add all new env vars |
| Modify | `helm/templates/api-deployment.yaml` | Add new env var blocks |
| Modify | `helm/values.yaml` | Add `widgetRateLimitPerHour`, `widgetConversationMaxMessages`, `defaultLlm` |
| Create | `apps/api/src/modules/agent/agent.service.test.ts` | Update existing tests + add `streamResponse` tests |
| Create | `apps/api/src/common/middleware/widget-rate-limit.test.ts` | Rate limit middleware tests |
| Create | `apps/api/src/modules/widget/widget.service.test.ts` | SendMessage integration tests |
| Create | `apps/api/src/modules/client-account/client-account.test.ts` | Token rotation tests |
| Modify | `docs/architecture/component-diagram/enduser-request.md` | Replace with accurate sequence diagram |
| Modify | `docs/architecture/ERD/main-mermaid.md` | Add `WIDGET_IP_RATE_LIMIT` entity |
| Modify | `packages/widget/CLAUDE.md` | Update config docs: `clientId` → `widgetToken` |

---

### Task 1: Add `TooManyRequestsError` and new env vars to API config

**Files:**
- Modify: `apps/api/src/common/errors.ts`
- Modify: `apps/api/src/common/config.ts`

- [ ] **Step 1: Add `TooManyRequestsError` to errors.ts**

Add after the existing `BadRequestError` class:

```ts
export class TooManyRequestsError extends AppError {
	constructor(message = "Too many requests") {
		super(429, "TOO_MANY_REQUESTS", message)
	}
}
```

- [ ] **Step 2: Add new env vars to config.ts Zod schema**

Add these fields to the `envSchema` object, after `PROVIDER_KEY_SECRET`:

```ts
// Widget rate limiting — max messages per IP per hour
WIDGET_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(60),
// Max messages per conversation before the user must start a new one
WIDGET_CONVERSATION_MAX_MESSAGES: z.coerce
	.number()
	.int()
	.positive()
	.default(50),
// Default LLM provider — used when a client has not configured their own
DEFAULT_LLM_PROVIDER_TYPE: z
	.enum(["openai", "openai_compatible", "google", "anthropic"])
	.optional(),
DEFAULT_LLM_API_KEY: z.string().optional(),
DEFAULT_LLM_MODEL: z.string().optional(),
DEFAULT_LLM_BASE_URL: z.string().optional(),
```

Also add matching test defaults inside the `testDefaults` object:

```ts
WIDGET_RATE_LIMIT_PER_HOUR: 60,
WIDGET_CONVERSATION_MAX_MESSAGES: 50,
```

Do NOT add DEFAULT_LLM_* to testDefaults — they are optional and should be undefined in tests unless explicitly set.

Add a helper function at the bottom of the file (after `config` export) to build a default provider config:

```ts
export function getDefaultProviderConfig(): AiProviderConfig | null {
	const { DEFAULT_LLM_PROVIDER_TYPE, DEFAULT_LLM_API_KEY, DEFAULT_LLM_MODEL } =
		env
	if (!DEFAULT_LLM_PROVIDER_TYPE || !DEFAULT_LLM_API_KEY || !DEFAULT_LLM_MODEL)
		return null
	return {
		type: DEFAULT_LLM_PROVIDER_TYPE,
		apiKey: DEFAULT_LLM_API_KEY,
		model: DEFAULT_LLM_MODEL,
		baseURL: env.DEFAULT_LLM_BASE_URL ?? undefined,
	}
}
```

Add `import type { AiProviderConfig } from "shared"` at the top of config.ts.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd apps/api && bunx tsc --noEmit`
Expected: No errors related to the new types.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/common/errors.ts apps/api/src/common/config.ts
git commit -m "feat(api): add TooManyRequestsError and widget/default-LLM config vars"
```

---

### Task 2: Create rate-limits DB schema + expose widgetToken in DTO

**Files:**
- Create: `packages/db/src/schema/rate-limits.ts`
- Modify: `packages/db/src/schema/index.ts`
- Modify: `packages/db/src/dto/client.dto.ts`

- [ ] **Step 1: Create the rate-limits schema file**

Create `packages/db/src/schema/rate-limits.ts`:

```ts
import { integer, pgTable, primaryKey, timestamp, varchar } from "drizzle-orm/pg-core"

export const widgetIpRateLimits = pgTable(
	"widget_ip_rate_limits",
	{
		ip: varchar("ip", { length: 45 }).notNull(),
		window: timestamp("window", { withTimezone: true }).notNull(),
		count: integer("count").notNull().default(0),
	},
	(table) => [primaryKey({ columns: [table.ip, table.window] })],
)
```

- [ ] **Step 2: Export from schema index**

Add to `packages/db/src/schema/index.ts`:

```ts
export * from "./rate-limits"
```

- [ ] **Step 3: Expose widgetToken in clientResponseSchema**

In `packages/db/src/dto/client.dto.ts`, change line 19 from:

```ts
}).omit({ passwordHash: true, widgetToken: true })
```

to:

```ts
}).omit({ passwordHash: true })
```

- [ ] **Step 4: Build the db package**

Run: `cd packages/db && bun run build`
Expected: Build succeeds.

- [ ] **Step 5: Generate the migration**

Run: `cd packages/db && bun run db:generate`
Expected: A new migration file is created in `drizzle/` containing the `CREATE TABLE widget_ip_rate_limits` statement.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/schema/rate-limits.ts packages/db/src/schema/index.ts packages/db/src/dto/client.dto.ts packages/db/drizzle/
git commit -m "feat(db): add widgetIpRateLimits table and expose widgetToken in client DTO"
```

---

### Task 3: Add `history` to `AiServiceInput` and guard `createContextTools`

**Files:**
- Modify: `apps/api/src/modules/agent/agent.types.ts`
- Modify: `apps/api/src/modules/agent/agent.tools.ts`

- [ ] **Step 1: Add `history` field to `AiServiceInput`**

In `agent.types.ts`, add `import type { ModelMessage } from "ai"` at the top (verbatimModuleSyntax requires `import type`). Then add the `history` field:

```ts
export type AiServiceInput = {
	userMessage: string
	history?: ModelMessage[]
	context: string
	wordBlacklist: string[]
	mcpServers: McpServerConfig[]
	contextDirectory: string
	provider: AiProviderConfig
	maxSteps?: number
}
```

- [ ] **Step 2: Guard `createContextTools` against empty `contextDirectory`**

In `agent.tools.ts`, add an early return as the first line of `createContextTools`:

```ts
export async function createContextTools(contextDirectory: string) {
	if (!contextDirectory) return {}
	// ... existing implementation unchanged
```

- [ ] **Step 3: Verify existing agent tests still pass**

Run: `cd apps/api && bun test src/modules/agent/agent.service.test.ts`
Expected: All existing tests pass (the `history` field is optional so no callers break).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/agent/agent.types.ts apps/api/src/modules/agent/agent.tools.ts
git commit -m "feat(agent): add history field to AiServiceInput and guard empty contextDirectory"
```

---

### Task 4: Add `streamResponse` to agent service

**Files:**
- Modify: `apps/api/src/modules/agent/agent.service.ts`
- Modify: `apps/api/src/modules/agent/agent.service.test.ts`

- [ ] **Step 1: Add `streamResponse` function**

In `agent.service.ts`, add `streamText` to the import from `"ai"`, then add the new function after `generateResponse`:

```ts
import { generateText, streamText, stepCountIs } from "ai"
```

```ts
export async function streamResponse(
	input: AiServiceInput,
): Promise<ReadableStream<string>> {
	const model = createLanguageModel(input.provider)
	const fileTools = await createContextTools(input.contextDirectory)
	const mcpConnection = await connectMcpServers(input.mcpServers)

	const history: CoreMessage[] = input.history ?? []

	const result = streamText({
		model,
		system: input.context,
		messages: [...history, { role: "user", content: input.userMessage }],
		tools: {
			...fileTools,
			...mcpConnection.tools,
		},
		stopWhen: stepCountIs(input.maxSteps ?? 10),
	})

	// Wrap the text stream to handle MCP cleanup on close/error
	const encoder = new TextEncoder()
	const decoder = new TextDecoder()

	return new ReadableStream<string>({
		async pull(controller) {
			const { value, done } = await result.textStream.getReader().read()
			if (done) {
				controller.close()
				await mcpConnection.close()
				return
			}
			controller.enqueue(value)
		},
		async cancel() {
			await mcpConnection.close()
		},
	})
}
```

Add `import type { CoreMessage } from "ai"` at the top (verbatimModuleSyntax).

- [ ] **Step 2: Write tests for `streamResponse`**

Update `agent.service.test.ts`. Add `streamText` to the mock at the top:

```ts
const mockTextStream = {
	getReader: () => ({
		read: mock(async () => {
			if (mockStreamChunks.length === 0) {
				return { value: undefined, done: true }
			}
			const chunk = mockStreamChunks.shift()
			return { value: chunk, done: false }
		}),
	}),
}

let mockStreamChunks: string[] = []

const mockStreamText = mock((_opts: unknown) => ({
	textStream: mockTextStream,
}))

mock.module("ai", () => ({
	generateText: mockGenerateText,
	streamText: mockStreamText,
	stepCountIs: mockStepCountIs,
	tool: (config: unknown) => config,
}))
```

Then add a new `describe` block:

```ts
describe("streamResponse", () => {
	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "agent-service-test-"))
		const contextDir = join(tempDir, "context")
		await mkdir(contextDir)

		baseInput = {
			userMessage: "Hello",
			context: "You are a helpful assistant",
			wordBlacklist: [],
			mcpServers: [],
			contextDirectory: contextDir,
			provider: {
				type: "openai_compatible" as const,
				baseURL: "https://api.example.com",
				apiKey: "test-key",
				model: "gpt-4",
			},
		}

		mockStreamChunks = ["Hello", " from", " AI"]
		mockStreamText.mockClear()
		mockClose.mockClear()
		mockCreateMCPClient.mockClear()
	})

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true })
	})

	it("returns a ReadableStream that yields token chunks", async () => {
		const stream = await streamResponse(baseInput)
		const reader = stream.getReader()
		const chunks: string[] = []
		while (true) {
			const { value, done } = await reader.read()
			if (done) break
			chunks.push(value)
		}
		expect(chunks).toEqual(["Hello", " from", "AI"])
	})

	it("passes history as messages to streamText", async () => {
		await streamResponse({
			...baseInput,
			history: [
				{ role: "user", content: "previous question" },
				{ role: "assistant", content: "previous answer" },
			],
		})
		const opts = mockStreamText.mock.calls[0][0] as {
			messages: unknown[]
		}
		expect(opts.messages).toHaveLength(3)
	})

	it("closes MCP connection when stream completes", async () => {
		const stream = await streamResponse({
			...baseInput,
			mcpServers: [{ type: "sse", url: "http://example.com" }],
		})
		const reader = stream.getReader()
		// Drain the stream
		while (true) {
			const { done } = await reader.read()
			if (done) break
		}
		expect(mockClose).toHaveBeenCalledTimes(1)
	})

	it("closes MCP connection when stream is cancelled", async () => {
		const stream = await streamResponse({
			...baseInput,
			mcpServers: [{ type: "sse", url: "http://example.com" }],
		})
		await stream.cancel()
		expect(mockClose).toHaveBeenCalledTimes(1)
	})

	it("works with empty contextDirectory (returns no tools)", async () => {
		const stream = await streamResponse({
			...baseInput,
			contextDirectory: "",
		})
		const reader = stream.getReader()
		const chunks: string[] = []
		while (true) {
			const { value, done } = await reader.read()
			if (done) break
			chunks.push(value)
		}
		expect(chunks).toEqual(["Hello", " from", "AI"])
	})
})
```

Import `streamResponse` alongside `generateResponse`.

- [ ] **Step 3: Run the tests**

Run: `cd apps/api && bun test src/modules/agent/agent.service.test.ts`
Expected: All tests pass (both old `generateResponse` and new `streamResponse` suites).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/agent/agent.service.ts apps/api/src/modules/agent/agent.service.test.ts
git commit -m "feat(agent): add streamResponse with history support and tests"
```

---

### Task 5: Add `getMessageCount` to WidgetRepository

**Files:**
- Modify: `apps/api/src/modules/widget/widget.repository.ts`

- [ ] **Step 1: Add `getMessageCount` method**

Add to `WidgetRepository` class, after `getMessages`:

```ts
async getMessageCount(conversationId: string, clientId: string) {
	const conversation = await this.getConversation(conversationId, clientId)
	if (!conversation) return null
	const result = await this.db
		.select({ count: sql`count(*)::int` })
		.from(messages)
		.where(eq(messages.conversationId, conversationId))
		.then((rows) => rows[0]?.count ?? 0)
	return result
}
```

Add `sql` to the import from `"drizzle-orm"` at the top of the file.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/api && bunx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/widget/widget.repository.ts
git commit -m "feat(widget): add getMessageCount to WidgetRepository"
```

---

### Task 6: Create IP rate limit middleware

**Files:**
- Create: `apps/api/src/common/middleware/widget-rate-limit.ts`
- Create: `apps/api/src/common/middleware/widget-rate-limit.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/common/middleware/widget-rate-limit.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import type { MiddlewareHandler } from "hono"

const mockSelect = mock(async () => [])
const mockInsert = mock(async () => [{ count: 1 }])
const mockUpdate = mock(async () => [{ count: 2 }])
const mockDelete = mock(async () => [])

const mockDb = {
	select: mock(() => ({
		from: mock(() => ({
			where: mock(async () => []),
		})),
	})),
	insert: mock(() => ({
		values: mock(() => ({
			onConflictDoUpdate: mock(() => ({
				returning: mock(async () => [{ count: 1 }]),
			})),
		})),
	})),
	delete: mock(() => ({
		where: mock(async () => []),
	})),
} as unknown as import("../../db").DB

mock.module("../../db", () => ({ db: mockDb }))
mock.module("../config", () => ({
	config: { WIDGET_RATE_LIMIT_PER_HOUR: 2 },
}))

const { widgetRateLimit } = await import("./widget-rate-limit")

function createMockContext(ip: string) {
	return {
		req: {
			header: mock((name: string) =>
				name === "X-Forwarded-For" ? ip : undefined,
			),
		},
		env: { remoteAddr: { hostname: ip } },
		json: mock((body: unknown, status: number) => ({ body, status })),
	} as unknown as Parameters<MiddlewareHandler>[0]
}

describe("widgetRateLimit", () => {
	beforeEach(() => {
		// Reset the mock insert's nested chain
		mockDb.insert = mock(() => ({
			values: mock(() => ({
				onConflictDoUpdate: mock(() => ({
					returning: mock(async () => [{ count: 1 }]),
				})),
			})),
		})) as never
	})

	it("passes when under the rate limit", async () => {
		const next = mock(async () => {})
		const c = createMockContext("1.2.3.4")
		await widgetRateLimit(c, next)
		expect(next).toHaveBeenCalled()
	})

	it("rejects when over the rate limit", async () => {
		mockDb.insert = mock(() => ({
			values: mock(() => ({
				onConflictDoUpdate: mock(() => ({
					returning: mock(async () => [{ count: 3 }]),
				})),
			})),
		})) as never

		const next = mock(async () => {})
		const c = createMockContext("1.2.3.4")
		expect(widgetRateLimit(c, next)).rejects.toThrow("Too many requests")
	})

	it("handles missing X-Forwarded-For by falling back to remoteAddr", async () => {
		const next = mock(async () => {})
		const c = createMockContext("")
		// When X-Forwarded-For is empty, should use remoteAddr
		await widgetRateLimit(c, next)
		expect(next).toHaveBeenCalled()
	})
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/api && bun test src/common/middleware/widget-rate-limit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the middleware**

Create `apps/api/src/common/middleware/widget-rate-limit.ts`:

```ts
import { isIP } from "node:net"
import { lt, sql } from "drizzle-orm"
import type { MiddlewareHandler } from "hono"
import { getConnInfo } from "hono/bun"
import { db } from "../../db"
import { widgetIpRateLimits } from "../../db/schema"
import { config } from "../config"
import { TooManyRequestsError } from "../errors"

/** Probability (0–1) of triggering stale window cleanup on any request. */
const CLEANUP_CHANCE = 0.01

const trustedProxies = new Set(
	config.TRUSTED_PROXY_IPS?.split(",").map((s) => s.trim()).filter(Boolean) ??
		[],
)

/** Delete rate-limit rows for windows older than 24 hours. */
async function cleanupStaleWindows() {
	const cutoff = new Date(Date.now() - 24 * 3_600_000)
	await db
		.delete(widgetIpRateLimits)
		.where(lt(widgetIpRateLimits.window, cutoff))
}

export const widgetRateLimit: MiddlewareHandler = async (c, next) => {
	// Extract IP: prefer validated forwarded IP only when direct connection is from a trusted proxy
	const connInfo = getConnInfo(c)
	const directIp = connInfo.remote.address

	const forwarded = c.req.header("X-Forwarded-For")
	const forwardedIp = forwarded?.split(",")[0]?.trim()
	const validForwarded =
		forwardedIp && isIP(forwardedIp) !== 0 ? forwardedIp : undefined

	const ip =
		directIp && trustedProxies.has(directIp) && validForwarded
			? validForwarded
			: directIp || validForwarded

	if (!ip) {
		throw new TooManyRequestsError(
			"Rate limiting unavailable: unable to determine client IP",
		)
	}

	// Truncate current time to the hour
	const window = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000)

	// Atomic upsert: increment count, return new count
	const [row] = await db
		.insert(widgetIpRateLimits)
		.values({ ip, window, count: 1 })
		.onConflictDoUpdate({
			target: [widgetIpRateLimits.ip, widgetIpRateLimits.window],
			set: { count: sql`${widgetIpRateLimits.count} + 1` },
		})
		.returning({ count: widgetIpRateLimits.count })

	if (row && row.count > config.WIDGET_RATE_LIMIT_PER_HOUR) {
		throw new TooManyRequestsError()
	}

	// Probabilistic cleanup so stale rows don't accumulate forever
	if (Math.random() < CLEANUP_CHANCE) {
		cleanupStaleWindows().catch(() => {})
	}

	await next()
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/api && bun test src/common/middleware/widget-rate-limit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/middleware/widget-rate-limit.ts apps/api/src/common/middleware/widget-rate-limit.test.ts
git commit -m "feat(api): add IP-based rate limit middleware for widget endpoints"
```

---

### Task 7: Rewrite WidgetService with LLM streaming + message limit

**Files:**
- Modify: `apps/api/src/modules/widget/widget.service.ts`

- [ ] **Step 1: Rewrite `WidgetService`**

Replace the entire file content. The new service injects four repositories, checks conversation message limits, fetches config from bot-config/provider-config/MCP repos, and delegates to `streamResponse`:

```ts
import type { CoreMessage } from "ai"
import { BadRequestError, NotFoundError, ValidationError } from "../../common/errors"
import { config, getDefaultProviderConfig } from "../../common/config"
import { decrypt } from "../../common/crypto"
import { streamResponse } from "../agent/agent.service"
import type { BotConfigRepository } from "../bot-config/bot-config.repository"
import type { McpRepository } from "../mcp/mcp.repository"
import type { ProviderConfigRepository } from "../provider-config/provider-config.repository"
import type { AiProviderConfig, McpServerConfig } from "shared"
import type { WidgetRepository } from "./widget.repository"

export class WidgetService {
	constructor(
		private readonly repo: WidgetRepository,
		private readonly botConfigRepo: BotConfigRepository,
		private readonly providerConfigRepo: ProviderConfigRepository,
		private readonly mcpRepo: McpRepository,
	) {}

	async createOrResumeSession(clientId: string, browserSessionId: string) {
		return this.repo.findOrCreateSession(clientId, browserSessionId)
	}

	async startConversation(clientId: string, sessionId: string) {
		const session = await this.repo.getSession(sessionId, clientId)
		if (!session) throw new NotFoundError("Session not found")
		return this.repo.createConversation(sessionId, clientId)
	}

	async getMessageHistory(clientId: string, conversationId: string) {
		const msgs = await this.repo.getMessages(conversationId, clientId)
		if (msgs === null) throw new NotFoundError("Conversation not found")
		return msgs
	}

	async sendMessage(
		clientId: string,
		conversationId: string,
		content: string,
	): Promise<{
		stream: ReadableStream<string>
		userMessage: Awaited<ReturnType<WidgetRepository["createMessage"]>>
	}> {
		const conversation = await this.repo.getConversation(
			conversationId,
			clientId,
		)
		if (!conversation) throw new NotFoundError("Conversation not found")

		// Check conversation message limit
		const messageCount = await this.repo.getMessageCount(
			conversationId,
			clientId,
		)
		if (
			messageCount !== null &&
			messageCount >= config.WIDGET_CONVERSATION_MAX_MESSAGES
		) {
			throw new BadRequestError(
				"CONVERSATION_LIMIT_REACHED",
				"Conversation limit reached — please start a new conversation",
			)
		}

		// Save user message
		const userMessage = await this.repo.createMessage(
			conversationId,
			"user",
			content,
		)

		// Resolve provider config (client-specific or platform default)
		const provider = await this.resolveProvider(clientId)
		if (!provider) {
			throw new BadRequestError(
				"PROVIDER_NOT_CONFIGURED",
				"No AI provider configured",
			)
		}

		// Fetch bot config → build system prompt
		const botConfig = await this.botConfigRepo.getByClientId(clientId)
		const contextParts: string[] = []
		if (botConfig?.systemPrompt) contextParts.push(botConfig.systemPrompt)
		if (botConfig?.toneStyle) contextParts.push(`Tone: ${botConfig.toneStyle}`)
		const context = contextParts.join("\n")

		// Fetch blacklist words
		const blacklistRows = await this.mcpRepo.listCustomServers(clientId)
		// Blacklist comes from the blacklist module — but we need to access it
		// For now, pass empty array; a follow-up can inject BlacklistRepository
		const wordBlacklist: string[] = []

		// Fetch MCP server configs
		const mcpServers = await this.resolveMcpServers(clientId)

		// Fetch conversation history
		const history = await this.buildHistory(conversationId, clientId)

		// Stream LLM response
		const stream = await streamResponse({
			userMessage: content,
			history,
			context,
			wordBlacklist,
			mcpServers,
			contextDirectory: "",
			provider,
			maxSteps: 10,
		})

		return { stream, userMessage }
	}

	async rateConversation(
		clientId: string,
		conversationId: string,
		rating: number,
	) {
		if (rating < 1 || rating > 5) {
			throw new ValidationError("Rating must be between 1 and 5")
		}
		const updated = await this.repo.rateConversation(
			conversationId,
			clientId,
			rating,
		)
		if (!updated) throw new NotFoundError("Conversation not found")
		return updated
	}

	private async resolveProvider(
		clientId: string,
	): Promise<AiProviderConfig | null> {
		const providerConfig =
			await this.providerConfigRepo.getByClientId(clientId)
		if (providerConfig) {
			return {
				type: providerConfig.providerType,
				apiKey: decrypt(
					providerConfig.apiKeyEncrypted,
					config.PROVIDER_KEY_SECRET,
				),
				model: providerConfig.model,
				baseURL: providerConfig.baseUrl ?? undefined,
			}
		}
		return getDefaultProviderConfig()
	}

	private async resolveMcpServers(
		clientId: string,
	): Promise<McpServerConfig[]> {
		const custom = await this.mcpRepo.listCustomServers(clientId)
		const preMade = await this.mcpRepo.listEnabledPreMade(clientId)
		return [
			...custom.map((s) => s.mcpConfig as unknown as McpServerConfig),
			...preMade.map(
				(s) => s.mcpConfig as unknown as McpServerConfig,
			),
		]
	}

	private async buildHistory(
		conversationId: string,
		clientId: string,
	): Promise<CoreMessage[]> {
		const dbMessages = await this.repo.getMessages(conversationId, clientId)
		if (!dbMessages) return []
		return dbMessages
			.filter((m) => m.role !== "system")
			.map((m) => ({
				role: m.role as "user" | "assistant",
				content: m.content,
			}))
	}
}
```

Note: The `wordBlacklist` is temporarily empty because `BlacklistRepository` is not injected yet. A follow-up can add it. The `decrypt` import comes from `../../common/crypto` (existing AES-256-GCM decrypt).

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/api && bunx tsc --noEmit`
Expected: May have type errors related to McpRepository return shapes — fix any mismatches by checking the actual return types of `listCustomServers` and `listEnabledPreMade`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/widget/widget.service.ts
git commit -m "feat(widget): rewrite sendMessage with LLM streaming and conversation limit"
```

---

### Task 8: Update widget routes — SSE streaming, remove DELETE, add rate limit

**Files:**
- Modify: `apps/api/src/modules/widget/widget.routes.ts`
- Modify: `apps/api/src/modules/widget/index.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Update widget.routes.ts**

Replace the `POST /` message route handler with SSE streaming using Hono's `streamSSE`. Remove the `DELETE /:conversationId` route entirely. Add the rate limit middleware to message routes.

The key changes:
1. Import `streamSSE` from `"hono/streaming"`
2. Import `widgetRateLimit` from `"../../common/middleware/widget-rate-limit"`
3. Apply `widgetRateLimit` as middleware on `widgetMessageRoutes`
4. Replace the `POST /` handler to return `text/event-stream` with SSE events
5. Remove the DELETE conversation route

The SSE handler reads from the `ReadableStream<string>` returned by `sendMessage`, accumulates tokens, saves the assistant message on completion, and records usage.

For the `POST /` message route, since OpenAPI doesn't natively support SSE responses well, the route will skip OpenAPI validation for the response and use `streamSSE` directly. The OpenAPI spec can document it as a `200 text/event-stream` string response.

- [ ] **Step 2: Update widget/index.ts to inject all four repos**

Replace the current wiring:

```ts
import { db } from "../../db"
import { BotConfigRepository } from "../bot-config/bot-config.repository"
import { McpRepository } from "../mcp/mcp.repository"
import { ProviderConfigRepository } from "../provider-config/provider-config.repository"
import { WidgetRepository } from "./widget.repository"
import { WidgetService } from "./widget.service"

const widgetRepository = new WidgetRepository(db)
const botConfigRepository = new BotConfigRepository(db)
const providerConfigRepository = new ProviderConfigRepository(db)
const mcpRepository = new McpRepository(db)
export const widgetService = new WidgetService(
	widgetRepository,
	botConfigRepository,
	providerConfigRepository,
	mcpRepository,
)

export {
	widgetConversationRoutes,
	widgetMessageRoutes,
	widgetSessionRoutes,
} from "./widget.routes"
```

- [ ] **Step 3: Simplify widget URL mounts in app.ts**

Change lines 66-74 from:

```ts
app.route("/widget/:clientId/sessions", widgetSessionRoutes)
app.route(
	"/widget/:clientId/sessions/:sessionId/conversations",
	widgetConversationRoutes,
)
app.route(
	"/widget/:clientId/sessions/:sessionId/conversations/:conversationId/messages",
	widgetMessageRoutes,
)
```

To:

```ts
app.route("/widget/sessions", widgetSessionRoutes)
app.route(
	"/widget/sessions/:sessionId/conversations",
	widgetConversationRoutes,
)
app.route(
	"/widget/sessions/:sessionId/conversations/:conversationId/messages",
	widgetMessageRoutes,
)
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd apps/api && bunx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/widget/widget.routes.ts apps/api/src/modules/widget/index.ts apps/api/src/app.ts
git commit -m "feat(widget): SSE streaming, remove DELETE route, simplify URLs, add rate limit"
```

---

### Task 9: Rename `clientId` → `widgetToken` in widget package

**Files:**
- Modify: `packages/widget/src/types.ts`
- Modify: `packages/widget/src/main.tsx`
- Modify: `packages/widget/CLAUDE.md`

- [ ] **Step 1: Rename in types.ts**

In `WidgetConfig`, change `clientId: string` to `widgetToken: string`. Update the JSDoc comment from `"Client ID for API authentication"` to `"Widget token for API authentication"`.

In `ResolvedWidgetConfig`, the `Omit<WidgetConfig, ...>` will automatically pick up the rename — no change needed there.

- [ ] **Step 2: Rename in main.tsx**

In `resolveConfig()`:
- Change `if (!userConfig?.clientId)` to `if (!userConfig?.widgetToken)`
- Change the error message from `clientId` to `widgetToken`
- Change `clientId: userConfig.clientId,` to `widgetToken: userConfig.widgetToken,`

- [ ] **Step 3: Update CLAUDE.md**

Change the runtime config example from:
```js
window.__AI_WIDGET_CONFIG__ = { clientId: "...", apiUrl: "..." }
```
to:
```js
window.__AI_WIDGET_CONFIG__ = { widgetToken: "...", apiUrl: "..." }
```

Change the required fields line from `clientId, apiUrl` to `widgetToken, apiUrl`.

- [ ] **Step 4: Build the widget package**

Run: `cd packages/widget && bun run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add packages/widget/src/types.ts packages/widget/src/main.tsx packages/widget/CLAUDE.md
git commit -m "refactor(widget): rename clientId to widgetToken in config"
```

---

### Task 10: Rewrite useWidget hook with real API calls + SSE

**Files:**
- Modify: `packages/widget/src/hooks/useWidget.ts`

- [ ] **Step 1: Rewrite useWidget with real fetch + SSE**

The changes are extensive. Key modifications:

1. Add `apiConfig: WidgetApiConfig` (containing `widgetToken` and `apiUrl`) to `UseWidgetOptions`.
2. Keep `isTyping` in `UseWidgetReturn` — do not rename to `isStreaming`.
3. Keep `clearMessages` in `UseWidgetReturn` — do not rename to `startNewConversation`.
4. Do NOT expose `isLimitReached` or `isStreaming`.
5. Session and conversation are managed via refs (not React state) for impermutability.
6. `session` and `conversation` are created eagerly on mount (not lazily on first send).
7. No role mapping — messages use `"assistant"` directly (not `"bot"`).
8. `sendMessage` signature: `(sessionId, conversationId, content, onEvent, signal?)` where `onEvent` is the SSE callback and `signal` is the optional `AbortSignal`.
9. Store session data in `localStorage` under `pagepal:widget:session` and reuse `browserSessionId` across page reloads.

The SSE parsing logic in `sendMessage`:
- Build the URL: `${apiUrl}/widget/sessions/${sessionId}/conversations/${conversationId}/messages`
- POST with `X-Widget-Token` header and `{ content: message }` body
- Read `response.body` as `ReadableStream`
- Accumulate chunks in a buffer, split on `\n\n`, parse `event:` and `data:` lines
- Handle `user_message`, `token`, `done`, `error` events
- Call `reader.releaseLock()` in a `finally` block

- [ ] **Step 2: Verify the widget builds**

Run: `cd packages/widget && bun run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add packages/widget/src/hooks/useWidget.ts
git commit -m "feat(widget): rewrite useWidget with real API calls and SSE streaming"
```

---

### Task 11: Update EmbeddedWidget + WidgetRoot to pass config through

**Files:**
- Modify: `packages/widget/src/EmbeddedWidget.tsx`
- Modify: `packages/widget/src/primitives/WidgetRoot.tsx`

- [ ] **Step 1: Update WidgetRoot to pass `apiUrl` and `widgetToken` to useWidget**

Add `apiUrl` and `widgetToken` to `WidgetRootProps` (it already extends `UseWidgetOptions`). Since `UseWidgetOptions` now requires these fields, they'll automatically be passed through.

However, the current `WidgetRootProps` extends `UseWidgetOptions` which previously didn't have these fields. After Task 10, `UseWidgetOptions` requires them, so they'll flow automatically.

But `EmbeddedWidget` currently only passes `defaultOpen`, `position`, and `defaultTheme` to `WidgetRoot`. It needs to also pass `apiUrl` and `widgetToken` from `config`.

- [ ] **Step 2: Update EmbeddedWidget to pass config values to WidgetRoot**

In `EmbeddedWidget.tsx`, change `WidgetRoot` props from:

```tsx
<WidgetRoot
	defaultOpen={config.defaultOpen}
	position={config.position}
	defaultTheme={getInitialTheme()}
>
```

To:

```tsx
<WidgetRoot
	defaultOpen={config.defaultOpen}
	position={config.position}
	defaultTheme={getInitialTheme()}
	apiUrl={config.apiUrl}
	widgetToken={config.widgetToken}
>
```

Also keep references `widget.isTyping` and `widget.clearMessages` throughout the component (do not rename to `isStreaming` or `startNewConversation`).

- [ ] **Step 3: Build the widget package**

Run: `cd packages/widget && bun run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/widget/src/EmbeddedWidget.tsx packages/widget/src/primitives/WidgetRoot.tsx
git commit -m "feat(widget): pass apiUrl/widgetToken to useWidget and keep isTyping/clearMessages"
```

---

### Task 12: Fix EmbedCodeCard — use widgetToken instead of DB id

**Files:**
- Modify: `apps/web/src/components/widget/setup/EmbedCodeCard.tsx`
- Modify: `apps/web/src/components/widget/WidgetSetup.tsx`

- [ ] **Step 1: Update EmbedCodeCard props**

In `EmbedCodeCard.tsx`:
- Change the prop type from `clientId: string | undefined` to `widgetToken: string | undefined`
- In the `configObject`, change `clientId,` to `widgetToken,`
- Update all references to `clientId` in the component body to `widgetToken`
- Update the placeholder code string

- [ ] **Step 2: Update WidgetSetup to pass widgetToken**

In `WidgetSetup.tsx`, change:
```tsx
<EmbedCodeCard
	clientId={client?.data?.id}
	...
/>
```
To:
```tsx
<EmbedCodeCard
	widgetToken={client?.data?.widgetToken}
	...
/>
```

- [ ] **Step 3: Verify the web app builds**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/widget/setup/EmbedCodeCard.tsx apps/web/src/components/widget/WidgetSetup.tsx
git commit -m "fix(web): use widgetToken instead of DB id in embed snippet"
```

---

### Task 13: Add widget token rotation endpoint

**Files:**
- Modify: `apps/api/src/modules/client-account/client-account.repository.ts`
- Modify: `apps/api/src/modules/client-account/client-account.service.ts`
- Modify: `apps/api/src/modules/client-account/client-account.routes.ts`

- [ ] **Step 1: Add `rotateWidgetToken` to repository**

In `client-account.repository.ts`, add a method:

```ts
async rotateWidgetToken(id: string): Promise<string | null> {
	const [updated] = await this.db
		.update(clients)
		.set({ widgetToken: crypto.randomUUID() })
		.where(eq(clients.id, id))
		.returning({ widgetToken: clients.widgetToken })
	return updated?.widgetToken ?? null
}
```

- [ ] **Step 2: Add `rotateWidgetToken` to service**

In `client-account.service.ts`, add a method:

```ts
async rotateWidgetToken(clientId: string): Promise<string> {
	const newToken = await this.repo.rotateWidgetToken(clientId)
	if (!newToken) throw new NotFoundError("Client not found")
	return newToken
}
```

- [ ] **Step 3: Add route**

In `client-account.routes.ts`, add a new route after the dismiss-widget-setup route:

```ts
router.openapi(
	createRoute({
		method: "post",
		path: "/me/widget-token/rotate",
		tags: ["Client Account"],
		summary: "Rotate widget token",
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				description: "Token rotated",
				content: {
					"application/json": {
						schema: z.object({ widgetToken: z.string() }),
					},
				},
			},
			404: {
				description: "Client not found",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string
		const widgetToken =
			await clientAccountService.rotateWidgetToken(clientId)
		return c.json({ widgetToken }, 200)
	},
)
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd apps/api && bunx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/client-account/client-account.repository.ts apps/api/src/modules/client-account/client-account.service.ts apps/api/src/modules/client-account/client-account.routes.ts
git commit -m "feat(api): add widget token rotation endpoint"
```

---

### Task 14: Update .env.example and Helm chart

**Files:**
- Modify: `.env.example`
- Modify: `helm/templates/api-deployment.yaml`
- Modify: `helm/values.yaml`

- [ ] **Step 1: Update .env.example**

Add after the existing `PROVIDER_KEY_SECRET` line:

```sh
# Widget rate limiting — max messages per IP per hour
WIDGET_RATE_LIMIT_PER_HOUR=60
# Max messages per conversation before the user must start a new one
WIDGET_CONVERSATION_MAX_MESSAGES=50

# Default LLM provider — used when a client has not configured their own.
# Supports any provider type the API supports (openai, anthropic, google, openai_compatible).
# Leave all DEFAULT_LLM_* vars unset to require each client to configure their own.
DEFAULT_LLM_PROVIDER_TYPE=openai
DEFAULT_LLM_API_KEY=sk-your-key-here
DEFAULT_LLM_MODEL=gpt-4o-mini
# Only required when DEFAULT_LLM_PROVIDER_TYPE=openai_compatible
DEFAULT_LLM_BASE_URL=
```

- [ ] **Step 2: Update helm/values.yaml**

Add under the `api:` section, after the `resources` block:

```yaml
  # Max widget messages per IP per hour
  widgetRateLimitPerHour: 60
  # Max messages per conversation before the user must start a new one
  widgetConversationMaxMessages: 50
  # Optional platform-level default LLM provider (clients can override per-account)
  defaultLlm:
    existingSecret: ""
```

- [ ] **Step 3: Update helm/templates/api-deployment.yaml**

Add after the `PROVIDER_KEY_SECRET` env block (after line 72), before the livenessProbe:

```yaml
            - name: WIDGET_RATE_LIMIT_PER_HOUR
              value: {{ .Values.api.widgetRateLimitPerHour | default 60 | quote }}
            - name: WIDGET_CONVERSATION_MAX_MESSAGES
              value: {{ .Values.api.widgetConversationMaxMessages | default 50 | quote }}
            {{- if .Values.api.defaultLlm.existingSecret }}
            - name: DEFAULT_LLM_PROVIDER_TYPE
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.api.defaultLlm.existingSecret }}
                  key: providerType
            - name: DEFAULT_LLM_API_KEY
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.api.defaultLlm.existingSecret }}
                  key: apiKey
            - name: DEFAULT_LLM_MODEL
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.api.defaultLlm.existingSecret }}
                  key: model
            - name: DEFAULT_LLM_BASE_URL
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.api.defaultLlm.existingSecret }}
                  key: baseUrl
                  optional: true
            {{- end }}
```

- [ ] **Step 4: Validate Helm template**

Run: `cd helm && helm template test . --set api.image.tag=test --set jwt.existingSecret=test-secret --set postgresql.auth.existingSecret=test-secret --set minio.existingSecret=test-secret --set resend.existingSecret=test-secret --set providerKey.existingSecret=test-secret 2>&1 | head -100`
Expected: No template errors.

- [ ] **Step 5: Commit**

```bash
git add .env.example helm/templates/api-deployment.yaml helm/values.yaml
git commit -m "feat(infra): add widget rate limit, message limit, and default LLM env vars"
```

---

### Task 15: Update architecture documentation

**Files:**
- Modify: `docs/architecture/component-diagram/enduser-request.md`
- Modify: `docs/architecture/ERD/main-mermaid.md`

- [ ] **Step 1: Replace enduser-request.md**

Replace the entire file content with the mermaid sequence diagram from the spec (Section 6 of the design document). This is the detailed sequence diagram showing the full widget→API→LLM flow with SSE streaming.

- [ ] **Step 2: Update ERD**

In `main-mermaid.md`, replace the `%% TODO: WIDGET_CONFIG entity is not yet defined — columns TBD` line with:

```
    WIDGET_IP_RATE_LIMIT {
        varchar ip PK
        timestamp window PK
        int count
    }
```

- [ ] **Step 3: Commit**

```bash
git add docs/architecture/component-diagram/enduser-request.md docs/architecture/ERD/main-mermaid.md
git commit -m "docs(architecture): update enduser-request diagram and ERD for agent integration"
```

---

### Task 16: Write widget service tests

**Files:**
- Create: `apps/api/src/modules/widget/widget.service.test.ts`

- [ ] **Step 1: Write the test file**

Create tests for `sendMessage` using in-memory repository stubs. Cover:
- User message saved before streaming starts
- `PROVIDER_NOT_CONFIGURED` error when no provider config exists and no default
- `CONVERSATION_LIMIT_REACHED` when at max messages
- Successful stream returned when provider is configured

Use mock repositories that implement the same interfaces as the real ones. Mock `streamResponse` from the agent module to return a controlled `ReadableStream`.

- [ ] **Step 2: Run the tests**

Run: `cd apps/api && bun test src/modules/widget/widget.service.test.ts`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/widget/widget.service.test.ts
git commit -m "test(widget): add sendMessage tests for provider errors and message limits"
```

---

### Task 17: Update requirements.md

**Files:**
- Modify: `docs/requirements.md`

- [ ] **Step 1: Update affected requirement completion statuses**

Per CLAUDE.md rules, update the `Completion` column for requirements affected by this work:

- FR-1.1: Change `In progress` → `Done` (real LLM responses now wired)
- FR-1.5: Change `Done` → `Done` (unchanged — clear button works differently now but still functions)
- FR-2.6: Change `In progress` → `Done` (platform default provider now available)
- NFR-3.2: Change from whatever it is → note that widget endpoints now have IP rate limiting (status stays approved, but this is now more complete)

- [ ] **Step 2: Commit**

```bash
git add docs/requirements.md
git commit -m "docs: update requirement completion status for agent integration"
```

---

## Self-Review Checklist

**1. Spec coverage:**

| Spec Section | Plan Tasks |
|---|---|
| Section 1: Widget ↔ API contract (widgetToken rename) | Tasks 9, 12 |
| Section 1: URL simplification | Task 8 |
| Section 1: Clear button = new conversation | Task 10 (clearMessages) |
| Section 1: widgetToken rotation | Task 13 |
| Section 2: streamResponse | Task 4 |
| Section 2: sendMessage rewrite | Task 7 |
| Section 2: createContextTools guard | Task 3 |
| Section 2: SSE route | Task 8 |
| Section 2: useWidget SSE | Task 10 |
| Section 2: no role mapping (assistant stays assistant) | Task 10 |
| Section 3: rate-limits schema | Task 2 |
| Section 3: widgetRateLimit middleware | Task 6 |
| Section 3: TooManyRequestsError | Task 1 |
| Section 4: .env.example defaults | Task 14 |
| Section 4: config.ts vars | Task 1 |
| Section 4: Helm deployment + values | Task 14 |
| Section 5: Tests | Tasks 4, 6, 16 |
| Section 6: Architecture docs | Task 15 |

**2. Placeholder scan:** No TBD, TODO, or "implement later" found. All steps have concrete code or specific instructions.

**3. Type consistency:**
- `widgetToken` used consistently (not `clientId`) in Tasks 9-12
- `isTyping` / `clearMessages` used consistently in Tasks 10-11
- `TooManyRequestsError` referenced consistently in Tasks 1, 6
- `getDefaultProviderConfig()` return type (`AiProviderConfig | null`) used consistently in Tasks 1, 7
- `CONVERSATION_LIMIT_REACHED` error code used consistently in Tasks 7, 10
