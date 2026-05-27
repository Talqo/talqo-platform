# Integration Tests Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand API integration test coverage from 4 to 20+ tests, document conventions in CLAUDE.md, and add integration tests to CI pipeline.

**Architecture:** Integration tests use the real Hono app with real PostgreSQL (test DB), mocking only external services (Resend, AI providers, S3). Unit tests use InMemoryRepository with no DB. Naming: `*.integration.ts` for integration, `*.test.ts` for unit.

**Tech Stack:** Bun test runner, Hono `app.request()`, raw SQL for DB cleanup, `bun:test` `mock()` and `mock.module()` for external services.

---

## File Structure

| File | Status | Purpose |
|------|--------|---------|
| `CLAUDE.md` | Modify | Add Integration Testing section |
| `apps/api/CLAUDE.md` | Modify | Add Integration Testing section with API-specific details |
| `.github/workflows/ci.yml` | Modify | Add integration test job |
| `apps/api/src/modules/auth/auth.integration.ts` | Modify | Expand from 4 to 8 tests |
| `apps/api/src/modules/client-account/client-account.integration.ts` | Create | Client profile/settings tests |
| `apps/api/src/modules/widget/widget.integration.ts` | Create | Widget session/conversation/message tests |
| `apps/api/src/modules/admin/admin.integration.ts` | Create | Admin client management tests |
| `docs/requirements.md` | Modify | Add NFR for integration test coverage |

---

## Task 1: Document Integration Testing in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`
- Modify: `apps/api/CLAUDE.md`

- [ ] **Step 1: Add Integration Testing section to root CLAUDE.md**

Insert after the `## Feedback loop` section:

```markdown
## Integration Tests

Integration tests live alongside unit tests in `apps/api/src/modules/<feature>/` and use the `.integration.ts` suffix.

**Naming:**
- `*.test.ts` — Unit tests using `InMemoryRepository`, no real database
- `*.integration.ts` — Integration tests using real app + real PostgreSQL + mocked external services

**Running:**
```bash
# Run all unit tests
bun run test

# Run integration tests only
bun run test:integration

# Run a specific integration test file
bun test --timeout 30000 ./src/modules/auth/auth.integration.ts
```

**Conventions:**
- Mock external services **before** dynamic imports (`mock.module()` at top of file)
- Use `app.request()` directly — no real server needed
- Clean up test data in `afterAll` using raw SQL to avoid circular imports
- Set `process.env` overrides in `beforeAll` before importing `@/app`
- Integration tests require a PostgreSQL database; config provides test defaults automatically
```

- [ ] **Step 2: Expand Testing section in apps/api/CLAUDE.md**

Replace the existing `## Testing` section with:

```markdown
## Testing

### Unit Tests (`*.test.ts`)
- Tests use `app.request()` directly — no real server needed
- Repositories export `InMemoryRepository` alongside Drizzle implementation; tests wire in-memory variant
- Mocks must be declared **before** dynamic `await import(...)` due to Bun module caching order
- Config auto-provides safe defaults in test env (`NODE_ENV=test` or `BUN_TEST=1`) — no `.env` required

### Integration Tests (`*.integration.ts`)
- Use the real `OpenAPIHono` app from `@/app` with real DB + real middleware
- Mock external services only (Resend, AI providers, S3) using `mock.module()` at file scope
- Use raw SQL for DB cleanup in `afterAll` — do NOT import repositories (avoid mocked module caching issues)
- Set required env vars in `beforeAll` before dynamic `import("@/app")`
- Timeout: 30s (`bun test --timeout 30000`)
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md apps/api/CLAUDE.md
git commit -m "docs: document integration test conventions in CLAUDE.md"
```

---

## Task 2: Add Integration Tests to CI Pipeline

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add integration test job to CI**

Add a new job after the `test` job:

```yaml
  integration-test:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: build
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.3.13"

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run DB migrations
        run: cd packages/db && bun run drizzle-kit migrate
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test

      - name: Run integration tests
        run: cd apps/api && bun run test:integration
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test
```

- [ ] **Step 2: Verify job dependency chain**

Integration tests depend on `build` (not `lint`) since they need compiled code. The `test` job also depends on `build`, which in turn depends on `lint`. This is fine.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add integration test job with postgres service"
```

---

## Task 3: Expand Auth Integration Tests

**Files:**
- Modify: `apps/api/src/modules/auth/auth.integration.ts`

- [ ] **Step 1: Add tests for auth edge cases (duplicate registration, invalid verify token, forgot-password flow)**

Add these tests inside the existing `describe` block:

```typescript
	it("POST /auth/register with duplicate email returns 409", async () => {
		const email = `integration-test-${Date.now()}-${crypto.randomUUID()}@example.com`
		const name = `Integration Test ${crypto.randomUUID()}`
		const password = "password123"

		const res1 = await realApp.request("/v1/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, email, password }),
		})
		expect(res1.status).toBe(201)
		createdEmails.add(email.toLowerCase())

		const res2 = await realApp.request("/v1/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Other", email, password }),
		})
		expect(res2.status).toBe(409)
	})

	it("POST /auth/verify-email with invalid token returns 400", async () => {
		const res = await realApp.request("/v1/auth/verify-email", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: "invalid-token" }),
		})
		expect(res.status).toBe(400)
	})

	it("POST /auth/forgot-password sends reset email for existing user", async () => {
		const email = `integration-test-${Date.now()}-${crypto.randomUUID()}@example.com`
		const name = `Integration Test ${crypto.randomUUID()}`
		const password = "password123"

		// Register and verify first
		const registerRes = await realApp.request("/v1/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, email, password }),
		})
		expect(registerRes.status).toBe(201)
		createdEmails.add(email.toLowerCase())

		const { config } = await import("@/common/config")
		const { default: postgres } = await import("postgres")
		const sql = postgres(config.DATABASE_URL)
		const rows =
			await sql`SELECT token FROM pending_registrations WHERE email = ${email.toLowerCase()}`
		const token = rows[0]?.token
		await sql.end()

		await realApp.request(`/v1/auth/verify-email?token=${token}`)

		// Request password reset
		const forgotRes = await realApp.request("/v1/auth/forgot-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		})
		expect(forgotRes.status).toBe(200)
	})

	it("POST /auth/me returns profile for authenticated user", async () => {
		const email = `integration-test-${Date.now()}-${crypto.randomUUID()}@example.com`
		const name = `Integration Test ${crypto.randomUUID()}`
		const password = "password123"

		// Register and verify
		const registerRes = await realApp.request("/v1/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, email, password }),
		})
		expect(registerRes.status).toBe(201)
		createdEmails.add(email.toLowerCase())

		const { config } = await import("@/common/config")
		const { default: postgres } = await import("postgres")
		const sql = postgres(config.DATABASE_URL)
		const rows =
			await sql`SELECT token FROM pending_registrations WHERE email = ${email.toLowerCase()}`
		const token = rows[0]?.token
		await sql.end()

		await realApp.request(`/v1/auth/verify-email?token=${token}`)

		// Login
		const loginRes = await realApp.request("/v1/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		})
		expect(loginRes.status).toBe(200)
		const { token: jwtToken } = (await loginRes.json()) as { token: string }

		// Get profile
		const meRes = await realApp.request("/v1/auth/me", {
			headers: { Authorization: `Bearer ${jwtToken}` },
		})
		expect(meRes.status).toBe(200)
		const body = (await meRes.json()) as { name: string; email: string }
		expect(body.name).toBe(name)
		expect(body.email).toBe(email.toLowerCase())
	})
```

- [ ] **Step 2: Run auth integration tests to verify**

```bash
cd apps/api
bun test --timeout 30000 ./src/modules/auth/auth.integration.ts
```
Expected: 8 pass, 0 fail

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/auth/auth.integration.ts
git commit -m "test(auth): expand integration tests to 8 tests"
```

---

## Task 4: Create Client Account Integration Tests

**Files:**
- Create: `apps/api/src/modules/client-account/client-account.integration.ts`

- [ ] **Step 1: Create the test file**

```typescript
import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test"
import type { OpenAPIHono } from "@hono/zod-openapi"
import type { AppVariables } from "@/common/jwt"

const mockSend = mock(async () => ({ data: { id: "test-id" }, error: null }))

mock.module("resend", () => ({
	Resend: class {
		emails = { send: mockSend }
	},
}))

async function cleanupEmails(emails: string[]) {
	const { config } = await import("@/common/config")
	const { default: postgres } = await import("postgres")
	const sql = postgres(config.DATABASE_URL)
	if (emails.length > 0) {
		await sql`DELETE FROM pending_registrations WHERE email = ANY(${emails})`
		await sql`DELETE FROM clients WHERE email = ANY(${emails})`
	}
	await sql.end()
}

describe("Client Account integration tests", () => {
	let realApp: OpenAPIHono<{ Variables: AppVariables }>
	const createdEmails = new Set<string>()

	beforeAll(async () => {
		process.env.APP_URL = "http://localhost:5173"
		process.env.RESEND_API_KEY = "test-api-key"
		const mod = await import("@/app")
		realApp = mod.default
	})

	afterAll(async () => {
		const emails = Array.from(createdEmails)
		await cleanupEmails(emails)
	})

	async function registerAndVerify(email: string, name: string, password: string) {
		const registerRes = await realApp.request("/v1/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, email, password }),
		})
		expect(registerRes.status).toBe(201)
		createdEmails.add(email.toLowerCase())

		const { config } = await import("@/common/config")
		const { default: postgres } = await import("postgres")
		const sql = postgres(config.DATABASE_URL)
		const rows =
			await sql`SELECT token FROM pending_registrations WHERE email = ${email.toLowerCase()}`
		await sql.end()
		const token = rows[0]?.token
		await realApp.request(`/v1/auth/verify-email?token=${token}`)

		const loginRes = await realApp.request("/v1/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		})
		expect(loginRes.status).toBe(200)
		const body = (await loginRes.json()) as { token: string }
		return body.token
	}

	it("GET /client returns authenticated client profile", async () => {
		const email = `integration-test-${Date.now()}-${crypto.randomUUID()}@example.com`
		const token = await registerAndVerify(email, "Account Test", "password123")

		const res = await realApp.request("/v1/client", {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as { name: string; email: string }
		expect(body.name).toBe("Account Test")
		expect(body.email).toBe(email.toLowerCase())
	})

	it("PUT /client updates client profile", async () => {
		const email = `integration-test-${Date.now()}-${crypto.randomUUID()}@example.com`
		const token = await registerAndVerify(email, "Old Name", "password123")

		const res = await realApp.request("/v1/client", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ name: "New Name" }),
		})
		expect(res.status).toBe(200)

		const getRes = await realApp.request("/v1/client", {
			headers: { Authorization: `Bearer ${token}` },
		})
		const body = (await getRes.json()) as { name: string }
		expect(body.name).toBe("New Name")
	})

	it("GET /client without token returns 401", async () => {
		const res = await realApp.request("/v1/client")
		expect(res.status).toBe(401)
	})

	it("DELETE /client deletes account and invalidates token", async () => {
		const email = `integration-test-${Date.now()}-${crypto.randomUUID()}@example.com`
		const token = await registerAndVerify(email, "Delete Me", "password123")

		const deleteRes = await realApp.request("/v1/client", {
			method: "DELETE",
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(deleteRes.status).toBe(200)

		const getRes = await realApp.request("/v1/client", {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(getRes.status).toBe(401)
	})
})
```

- [ ] **Step 2: Run the tests**

```bash
cd apps/api
bun test --timeout 30000 ./src/modules/client-account/client-account.integration.ts
```
Expected: 4 pass, 0 fail

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/client-account/client-account.integration.ts
git commit -m "test(client-account): add integration tests"
```

---

## Task 5: Create Widget Integration Tests

**Files:**
- Create: `apps/api/src/modules/widget/widget.integration.ts`

- [ ] **Step 1: Create the test file**

```typescript
import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test"
import type { OpenAPIHono } from "@hono/zod-openapi"
import type { AppVariables } from "@/common/jwt"

const mockSend = mock(async () => ({ data: { id: "test-id" }, error: null }))
const mockGenerateText = mock(async () => ({ text: "Hello from the bot", finishReason: "stop" }))

mock.module("resend", () => ({
	Resend: class {
		emails = { send: mockSend }
	},
}))

mock.module("ai", () => ({
	generateText: mockGenerateText,
	streamText: mockGenerateText,
}))

async function cleanupData(emails: string[]) {
	const { config } = await import("@/common/config")
	const { default: postgres } = await import("postgres")
	const sql = postgres(config.DATABASE_URL)
	if (emails.length > 0) {
		await sql`DELETE FROM messages WHERE conversation_id IN (
			SELECT id FROM conversations WHERE session_id IN (
				SELECT id FROM widget_sessions WHERE client_id IN (
					SELECT id FROM clients WHERE email = ANY(${emails})
				)
			)
		)`
		await sql`DELETE FROM conversations WHERE session_id IN (
			SELECT id FROM widget_sessions WHERE client_id IN (
				SELECT id FROM clients WHERE email = ANY(${emails})
			)
		)`
		await sql`DELETE FROM widget_sessions WHERE client_id IN (
			SELECT id FROM clients WHERE email = ANY(${emails})
		)`
		await sql`DELETE FROM clients WHERE email = ANY(${emails})`
	}
	await sql.end()
}

describe("Widget integration tests", () => {
	let realApp: OpenAPIHono<{ Variables: AppVariables }>
	const createdEmails = new Set<string>()

	beforeAll(async () => {
		process.env.APP_URL = "http://localhost:5173"
		process.env.RESEND_API_KEY = "test-api-key"
		const mod = await import("@/app")
		realApp = mod.default
	})

	afterAll(async () => {
		const emails = Array.from(createdEmails)
		await cleanupData(emails)
	})

	async function registerClient(email: string, name: string) {
		const registerRes = await realApp.request("/v1/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, email, password: "password123" }),
		})
		expect(registerRes.status).toBe(201)
		createdEmails.add(email.toLowerCase())

		const { config } = await import("@/common/config")
		const { default: postgres } = await import("postgres")
		const sql = postgres(config.DATABASE_URL)
		const rows =
			await sql`SELECT token FROM pending_registrations WHERE email = ${email.toLowerCase()}`
		const token = rows[0]?.token
		await realApp.request(`/v1/auth/verify-email?token=${token}`)
		const clientRows =
			await sql`SELECT id, widget_token FROM clients WHERE email = ${email.toLowerCase()}`
		await sql.end()
		return clientRows[0] as { id: string; widget_token: string }
	}

	it("POST /widget/sessions creates a new session", async () => {
		const email = `integration-test-${Date.now()}-${crypto.randomUUID()}@example.com`
		const client = await registerClient(email, "Widget Test")

		const res = await realApp.request("/v1/widget/sessions", {
			method: "POST",
			headers: { "X-Widget-Token": client.widget_token },
		})
		expect(res.status).toBe(201)
		const body = (await res.json()) as { session_id: string }
		expect(body.session_id).toBeDefined()
	})

	it("POST /widget/sessions/:sessionId/conversations creates a conversation", async () => {
		const email = `integration-test-${Date.now()}-${crypto.randomUUID()}@example.com`
		const client = await registerClient(email, "Widget Test")

		const sessionRes = await realApp.request("/v1/widget/sessions", {
			method: "POST",
			headers: { "X-Widget-Token": client.widget_token },
		})
		const { session_id: sessionId } = (await sessionRes.json()) as { session_id: string }

		const res = await realApp.request(
			`/v1/widget/sessions/${sessionId}/conversations`,
			{
				method: "POST",
				headers: { "X-Widget-Token": client.widget_token },
			},
		)
		expect(res.status).toBe(201)
		const body = (await res.json()) as { conversation_id: string }
		expect(body.conversation_id).toBeDefined()
	})

	it("GET /widget returns widget configuration", async () => {
		const email = `integration-test-${Date.now()}-${crypto.randomUUID()}@example.com`
		const client = await registerClient(email, "Widget Test")

		const res = await realApp.request("/v1/widget", {
			headers: { "X-Widget-Token": client.widget_token },
		})
		expect(res.status).toBe(200)
	})

	it("POST /widget/sessions/:sessionId/conversations/:conversationId/messages sends a message", async () => {
		const email = `integration-test-${Date.now()}-${crypto.randomUUID()}@example.com`
		const client = await registerClient(email, "Widget Test")

		const sessionRes = await realApp.request("/v1/widget/sessions", {
			method: "POST",
			headers: { "X-Widget-Token": client.widget_token },
		})
		const { session_id: sessionId } = (await sessionRes.json()) as { session_id: string }

		const convRes = await realApp.request(
			`/v1/widget/sessions/${sessionId}/conversations`,
			{
				method: "POST",
				headers: { "X-Widget-Token": client.widget_token },
			},
		)
		const { conversation_id: conversationId } = (await convRes.json()) as {
			conversation_id: string
		}

		const res = await realApp.request(
			`/v1/widget/sessions/${sessionId}/conversations/${conversationId}/messages`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Widget-Token": client.widget_token,
				},
				body: JSON.stringify({ content: "Hello bot" }),
			},
		)
		expect(res.status).toBe(201)
	})

	it("GET /widget/sessions/:sessionId/conversations lists conversations", async () => {
		const email = `integration-test-${Date.now()}-${crypto.randomUUID()}@example.com`
		const client = await registerClient(email, "Widget Test")

		const sessionRes = await realApp.request("/v1/widget/sessions", {
			method: "POST",
			headers: { "X-Widget-Token": client.widget_token },
		})
		const { session_id: sessionId } = (await sessionRes.json()) as { session_id: string }

		await realApp.request(`/v1/widget/sessions/${sessionId}/conversations`, {
			method: "POST",
			headers: { "X-Widget-Token": client.widget_token },
		})

		const res = await realApp.request(
			`/v1/widget/sessions/${sessionId}/conversations`,
			{
				headers: { "X-Widget-Token": client.widget_token },
			},
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { conversations: unknown[] }
		expect(Array.isArray(body.conversations)).toBe(true)
	})

	it("POST /widget/sessions without token returns 401", async () => {
		const res = await realApp.request("/v1/widget/sessions", { method: "POST" })
		expect(res.status).toBe(401)
	})
})
```

- [ ] **Step 2: Run the tests**

```bash
cd apps/api
bun test --timeout 30000 ./src/modules/widget/widget.integration.ts
```
Expected: 6 pass, 0 fail

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/widget/widget.integration.ts
git commit -m "test(widget): add integration tests for sessions, conversations, messages"
```

---

## Task 6: Create Admin Integration Tests

**Files:**
- Create: `apps/api/src/modules/admin/admin.integration.ts`

- [ ] **Step 1: Create the test file**

```typescript
import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test"
import type { OpenAPIHono } from "@hono/zod-openapi"
import type { AppVariables } from "@/common/jwt"

const mockSend = mock(async () => ({ data: { id: "test-id" }, error: null }))

mock.module("resend", () => ({
	Resend: class {
		emails = { send: mockSend }
	},
}))

async function cleanupData(emails: string[]) {
	const { config } = await import("@/common/config")
	const { default: postgres } = await import("postgres")
	const sql = postgres(config.DATABASE_URL)
	if (emails.length > 0) {
		await sql`DELETE FROM pending_registrations WHERE email = ANY(${emails})`
		await sql`DELETE FROM activity_logs WHERE admin_id IN (
			SELECT id FROM admins WHERE email = ANY(${emails})
		)`
		await sql`DELETE FROM admins WHERE email = ANY(${emails})`
		await sql`DELETE FROM clients WHERE email = ANY(${emails})`
	}
	await sql.end()
}

describe("Admin integration tests", () => {
	let realApp: OpenAPIHono<{ Variables: AppVariables }>
	const createdEmails = new Set<string>()

	beforeAll(async () => {
		process.env.APP_URL = "http://localhost:5173"
		process.env.RESEND_API_KEY = "test-api-key"
		const mod = await import("@/app")
		realApp = mod.default
	})

	afterAll(async () => {
		const emails = Array.from(createdEmails)
		await cleanupData(emails)
	})

	async function registerClient(email: string, name: string) {
		const registerRes = await realApp.request("/v1/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, email, password: "password123" }),
		})
		expect(registerRes.status).toBe(201)
		createdEmails.add(email.toLowerCase())

		const { config } = await import("@/common/config")
		const { default: postgres } = await import("postgres")
		const sql = postgres(config.DATABASE_URL)
		const rows =
			await sql`SELECT token FROM pending_registrations WHERE email = ${email.toLowerCase()}`
		const token = rows[0]?.token
		await realApp.request(`/v1/auth/verify-email?token=${token}`)
		await sql.end()
	}

	async function createAdminToken(): Promise<string> {
		const email = `admin-test-${Date.now()}-${crypto.randomUUID()}@example.com`
		const password = "admin123"
		const { config } = await import("@/common/config")
		const { default: postgres } = await import("postgres")
		const sql = postgres(config.DATABASE_URL)
		await sql`
			INSERT INTO admins (email, password_hash, name)
			VALUES (${email}, crypt(${password}, gen_salt('bf')), 'Test Admin')
		`
		await sql.end()
		createdEmails.add(email.toLowerCase())

		const loginRes = await realApp.request("/v1/admin/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		})
		expect(loginRes.status).toBe(200)
		const body = (await loginRes.json()) as { token: string }
		return body.token
	}

	it("GET /admin/clients returns list of clients for admin", async () => {
		const adminToken = await createAdminToken()
		const clientEmail = `integration-test-${Date.now()}-${crypto.randomUUID()}@example.com`
		await registerClient(clientEmail, "Client One")

		const res = await realApp.request("/v1/admin/clients", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as { clients: unknown[] }
		expect(Array.isArray(body.clients)).toBe(true)
	})

	it("POST /admin/clients/:id/suspend suspends a client", async () => {
		const adminToken = await createAdminToken()
		const clientEmail = `integration-test-${Date.now()}-${crypto.randomUUID()}@example.com`
		await registerClient(clientEmail, "Client Two")

		const { config } = await import("@/common/config")
		const { default: postgres } = await import("postgres")
		const sql = postgres(config.DATABASE_URL)
		const clientRows =
			await sql`SELECT id FROM clients WHERE email = ${clientEmail.toLowerCase()}`
		const clientId = clientRows[0]?.id
		await sql.end()

		const res = await realApp.request(`/v1/admin/clients/${clientId}/suspend`, {
			method: "POST",
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)
	})

	it("GET /admin/me returns admin profile", async () => {
		const adminToken = await createAdminToken()

		const res = await realApp.request("/v1/admin/me", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)
	})

	it("GET /admin/clients without token returns 401", async () => {
		const res = await realApp.request("/v1/admin/clients")
		expect(res.status).toBe(401)
	})
})
```

- [ ] **Step 2: Run the tests**

```bash
cd apps/api
bun test --timeout 30000 ./src/modules/admin/admin.integration.ts
```
Expected: 4 pass, 0 fail

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/admin/admin.integration.ts
git commit -m "test(admin): add integration tests for client management"
```

---

## Task 7: Update Integration Test Script to Run All Files

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: Update test:integration script to run all `*.integration.ts` files**

Change the script from:
```json
"test:integration": "bun test --timeout 30000 ./src/modules/auth/auth.integration.ts"
```
To:
```json
"test:integration": "bun test --timeout 30000 'src/**/*.integration.ts'"
```

Note: We use single quotes so the shell doesn't expand the glob before bun test gets it.

- [ ] **Step 2: Run all integration tests**

```bash
cd apps/api
bun run test:integration
```
Expected: 22 pass, 0 fail

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json
git commit -m "chore(api): update test:integration to run all integration test files"
```

---

## Task 8: Update Requirements Tracking

**Files:**
- Modify: `docs/requirements.md`

- [ ] **Step 1: Add integration testing NFR**

Add under `NFR-3: Security` (or create `NFR-6: Test Coverage`):

```markdown
### NFR-6: Test Coverage

| ID | Requirement | Notes | Priority | Completion |
|----|-------------|-------|----------|------------|
| NFR-6.1 | API must have integration tests covering all major modules (auth, client, widget, admin) with mocked external services | Integration tests use real DB; unit tests use in-memory repo | High | Done |
| NFR-6.2 | Integration tests must run in CI pipeline on every PR | Separate job with postgres service | High | Done |
```

- [ ] **Step 2: Commit**

```bash
git add docs/requirements.md
git commit -m "docs: add integration test coverage requirements"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
bun run fix
bun run type-check
bun run test
```

- [ ] **Step 2: Run integration tests**

```bash
cd apps/api
bun run test:integration
```
Expected: 22 pass, 0 fail

- [ ] **Step 3: Commit any formatting fixes**

```bash
git add -A
git commit -m "style: apply biome formatting"
```

---

## Self-Review Checklist

1. **Spec coverage:** All requested items addressed:
   - ✅ Existing tests fixed (already passing)
   - ✅ Integration tests documented in CLAUDE.md
   - ✅ Naming convention clarified (`.integration.ts` vs `.test.ts`)
   - ✅ CI pipeline runs integration tests
   - ✅ 22 integration tests across auth, client-account, widget, admin
   - ✅ External services mocked (Resend, AI)

2. **Placeholder scan:** No TBD, TODO, or vague steps in plan.

3. **Type consistency:** All mock returns and response shapes match patterns from existing codebase.
