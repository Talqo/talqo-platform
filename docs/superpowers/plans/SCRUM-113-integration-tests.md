# SCRUM-113: Integration Tests

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up integration tests for the API (`apps/api`) and React SPA (`apps/web`), targeting critical modules and components.

**Architecture:**
- **API:** Uses `hono` `testClient` against a fully wired app + test database (via `bun test` with `BUN_TEST=1` env). Each test file creates its own test DB or uses transactions.
- **Web:** Uses `@testing-library/react` + `vitest` (or `bun:test` with `happy-dom`). Tests route rendering and hook logic, mocking the API client.

**Tech Stack:** Bun test runner, Hono testClient, drizzle-orm, vitest (web), @testing-library/react

---

### Task 1: Set up API test harness

**Files:**
- Create: `apps/api/test/setup.ts`
- Modify: `apps/api/package.json` (test script)

- [ ] **Step 1: Create test database helper**

  ```typescript
  // apps/api/test/setup.ts
  import { drizzle } from "drizzle-orm/postgres-js"
  import postgres from "postgres"
  import * as schema from "db/schema"

  const testDatabaseUrl =
    process.env.TEST_DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/pagepal_test"

  export async function createTestDb() {
    const client = postgres(testDatabaseUrl, { max: 1 })
    const db = drizzle(client, { schema })
    return { db, client }
  }

  export async function resetDb(db: ReturnType<typeof drizzle>, client: postgres.Sql) {
    // Truncate all tables
    const tables = Object.values(schema)
      .filter((t) => t && typeof t === "object" && "name" in t)
      .map((t) => `"${(t as { name: string }).name}"`)
    if (tables.length > 0) {
      await client`TRUNCATE ${client.unsafe(tables.join(", "))} CASCADE`
    }
  }
  ```

- [ ] **Step 2: Create app factory for tests**

  ```typescript
  // apps/api/test/app.ts
  import { createApp } from "../src/app"

  export function createTestApp() {
    // createApp should be refactored to accept a db instance if not already
    return createApp()
  }
  ```

  If `src/app.ts` does not export a factory, create one:

  ```typescript
  // apps/api/src/app.ts (new or existing)
  import { Hono } from "hono"
  import { db } from "db/client"

  export function createApp(database = db) {
    const app = new Hono()
    // ... wire routes using database
    return app
  }
  ```

- [ ] **Step 3: Create first smoke test**

  ```typescript
  // apps/api/src/index.test.ts
  import { describe, it, expect } from "bun:test"

  describe("API smoke test", () => {
    it("should respond 404 on unknown route", async () => {
      const res = await fetch("http://localhost:3000/unknown")
      expect(res.status).toBe(404)
    })
  })
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add apps/api/test/ apps/api/src/app.ts apps/api/src/index.test.ts
  git commit -m "test(api): set up integration test harness"
  ```

### Task 2: Add API integration tests for Auth

**Files:**
- Create: `apps/api/src/modules/auth/auth.test.ts`

- [ ] **Step 1: Write login/register tests**

  ```typescript
  import { describe, it, expect, beforeAll, afterAll } from "bun:test"
  import { createTestApp } from "../../test/app"
  import { createTestDb, resetDb } from "../../test/setup"

  describe("Auth endpoints", () => {
    let app: ReturnType<typeof createTestApp>
    let db: Awaited<ReturnType<typeof createTestDb>>["db"]
    let client: Awaited<ReturnType<typeof createTestDb>>["client"]

    beforeAll(async () => {
      const { db: d, client: c } = await createTestDb()
      db = d
      client = c
      app = createTestApp(db)
    })

    afterAll(async () => {
      await client.end()
    })

    beforeEach(async () => {
      await resetDb(db, client)
    })

    it("POST /auth/register should create a client", async () => {
      const res = await app.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Client",
          email: "test@example.com",
          password: "password123",
        }),
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.message).toBeDefined()
    })

    it("POST /auth/login should return token for valid credentials", async () => {
      // register first
      await app.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Client",
          email: "login@example.com",
          password: "password123",
        }),
      })

      const res = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "login@example.com",
          password: "password123",
        }),
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.token).toBeDefined()
    })

    it("POST /auth/login should return 401 for invalid credentials", async () => {
      const res = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "bad@example.com",
          password: "wrong",
        }),
      })
      expect(res.status).toBe(401)
    })
  })
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add apps/api/src/modules/auth/auth.test.ts
  git commit -m "test(api): add auth integration tests"
  ```

### Task 3: Add API integration tests for Widget

**Files:**
- Create: `apps/api/src/modules/widget/widget.test.ts`

- [ ] **Step 1: Write widget session tests**

  ```typescript
  import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test"
  import { createTestApp } from "../../test/app"
  import { createTestDb, resetDb } from "../../test/setup"

  describe("Widget endpoints", () => {
    let app: ReturnType<typeof createTestApp>
    let db: Awaited<ReturnType<typeof createTestDb>>["db"]
    let client: Awaited<ReturnType<typeof createTestDb>>["client"]

    beforeAll(async () => {
      const { db: d, client: c } = await createTestDb()
      db = d
      client = c
      app = createTestApp(db)
    })

    afterAll(async () => {
      await client.end()
    })

    beforeEach(async () => {
      await resetDb(db, client)
    })

    it("POST /widget/sessions should create a session", async () => {
      const res = await app.request("/widget/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Widget-Token": "dummy-token",
        },
        body: JSON.stringify({ browserSessionId: "sess-123" }),
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.id).toBeDefined()
    })
  })
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add apps/api/src/modules/widget/widget.test.ts
  git commit -m "test(api): add widget session integration tests"
  ```

### Task 4: Add API integration tests for Admin

**Files:**
- Create: `apps/api/src/modules/admin/admin.test.ts`

- [ ] **Step 1: Write admin client list tests**

  ```typescript
  import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test"
  import { createTestApp } from "../../test/app"
  import { createTestDb, resetDb } from "../../test/setup"

  describe("Admin endpoints", () => {
    let app: ReturnType<typeof createTestApp>
    let db: Awaited<ReturnType<typeof createTestDb>>["db"]
    let client: Awaited<ReturnType<typeof createTestDb>>["client"]

    beforeAll(async () => {
      const { db: d, client: c } = await createTestDb()
      db = d
      client = c
      app = createTestApp(db)
    })

    afterAll(async () => {
      await client.end()
    })

    beforeEach(async () => {
      await resetDb(db, client)
    })

    it("GET /admin/clients should require admin auth", async () => {
      const res = await app.request("/admin/clients")
      expect(res.status).toBe(401)
    })

    it("GET /admin/analytics should require admin auth", async () => {
      const res = await app.request("/admin/analytics")
      expect(res.status).toBe(401)
    })
  })
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add apps/api/src/modules/admin/admin.test.ts
  git commit -m "test(api): add admin integration tests"
  ```

### Task 5: Add API integration tests for MCP

**Files:**
- Create: `apps/api/src/modules/mcp/mcp.test.ts`

- [ ] **Step 1: Write MCP CRUD tests**

  ```typescript
  import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test"
  import { createTestApp } from "../../test/app"
  import { createTestDb, resetDb } from "../../test/setup"

  describe("MCP endpoints", () => {
    let app: ReturnType<typeof createTestApp>
    let db: Awaited<ReturnType<typeof createTestDb>>["db"]
    let client: Awaited<ReturnType<typeof createTestDb>>["client"]

    beforeAll(async () => {
      const { db: d, client: c } = await createTestDb()
      db = d
      client = c
      app = createTestApp(db)
    })

    afterAll(async () => {
      await client.end()
    })

    beforeEach(async () => {
      await resetDb(db, client)
    })

    it("GET /client/me/mcp/pre-made should require auth", async () => {
      const res = await app.request("/client/me/mcp/pre-made")
      expect(res.status).toBe(401)
    })
  })
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add apps/api/src/modules/mcp/mcp.test.ts
  git commit -m "test(api): add mcp integration tests"
  ```

### Task 6: Add API integration tests for Client Account

**Files:**
- Create: `apps/api/src/modules/client/client.test.ts`

- [ ] **Step 1: Write client profile tests**

  ```typescript
  import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test"
  import { createTestApp } from "../../test/app"
  import { createTestDb, resetDb } from "../../test/setup"

  describe("Client endpoints", () => {
    let app: ReturnType<typeof createTestApp>
    let db: Awaited<ReturnType<typeof createTestDb>>["db"]
    let client: Awaited<ReturnType<typeof createTestDb>>["client"]

    beforeAll(async () => {
      const { db: d, client: c } = await createTestDb()
      db = d
      client = c
      app = createTestApp(db)
    })

    afterAll(async () => {
      await client.end()
    })

    beforeEach(async () => {
      await resetDb(db, client)
    })

    it("GET /client/me should require auth", async () => {
      const res = await app.request("/client/me")
      expect(res.status).toBe(401)
    })

    it("GET /client/me/bot-config should require auth", async () => {
      const res = await app.request("/client/me/bot-config")
      expect(res.status).toBe(401)
    })
  })
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add apps/api/src/modules/client/client.test.ts
  git commit -m "test(api): add client account integration tests"
  ```

### Task 7: Add API integration tests for Analytics

**Files:**
- Create: `apps/api/src/modules/analytics/analytics.test.ts`

- [ ] **Step 1: Write analytics tests**

  ```typescript
  import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test"
  import { createTestApp } from "../../test/app"
  import { createTestDb, resetDb } from "../../test/setup"

  describe("Analytics endpoints", () => {
    let app: ReturnType<typeof createTestApp>
    let db: Awaited<ReturnType<typeof createTestDb>>["db"]
    let client: Awaited<ReturnType<typeof createTestDb>>["client"]

    beforeAll(async () => {
      const { db: d, client: c } = await createTestDb()
      db = d
      client = c
      app = createTestApp(db)
    })

    afterAll(async () => {
      await client.end()
    })

    beforeEach(async () => {
      await resetDb(db, client)
    })

    it("GET /client/me/analytics should require auth", async () => {
      const res = await app.request("/client/me/analytics")
      expect(res.status).toBe(401)
    })
  })
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add apps/api/src/modules/analytics/analytics.test.ts
  git commit -m "test(api): add analytics integration tests"
  ```

### Task 8: Add API integration tests for Blacklist

**Files:**
- Create: `apps/api/src/modules/blacklist/blacklist.test.ts`

- [ ] **Step 1: Write blacklist tests**

  ```typescript
  import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test"
  import { createTestApp } from "../../test/app"
  import { createTestDb, resetDb } from "../../test/setup"

  describe("Blacklist endpoints", () => {
    let app: ReturnType<typeof createTestApp>
    let db: Awaited<ReturnType<typeof createTestDb>>["db"]
    let client: Awaited<ReturnType<typeof createTestDb>>["client"]

    beforeAll(async () => {
      const { db: d, client: c } = await createTestDb()
      db = d
      client = c
      app = createTestApp(db)
    })

    afterAll(async () => {
      await client.end()
    })

    beforeEach(async () => {
      await resetDb(db, client)
    })

    it("GET /client/me/blacklist should require auth", async () => {
      const res = await app.request("/client/me/blacklist")
      expect(res.status).toBe(401)
    })
  })
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add apps/api/src/modules/blacklist/blacklist.test.ts
  git commit -m "test(api): add blacklist integration tests"
  ```

### Task 9: Set up Web (React) test harness

**Files:**
- Create: `apps/web/vitest.config.ts`
- Modify: `apps/web/package.json`
- Create: `apps/web/test/setup.ts`

- [ ] **Step 1: Add vitest + testing-library dependencies**

  ```bash
  cd apps/web && bun add -d vitest @vitest/ui @testing-library/react @testing-library/jest-dom happy-dom
  ```

- [ ] **Step 2: Create vitest config**

  ```typescript
  // apps/web/vitest.config.ts
  import { defineConfig } from "vitest/config"
  import react from "@vitejs/plugin-react"
  import path from "path"

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: "happy-dom",
      globals: true,
      setupFiles: ["./test/setup.ts"],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  })
  ```

- [ ] **Step 3: Create test setup**

  ```typescript
  // apps/web/test/setup.ts
  import "@testing-library/jest-dom"
  ```

- [ ] **Step 4: Update package.json test script**

  ```json
  "test": "vitest run"
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/vitest.config.ts apps/web/test/setup.ts apps/web/package.json
  git commit -m "test(web): set up vitest + testing-library harness"
  ```

### Task 10: Add Web component tests for Login page

**Files:**
- Create: `apps/web/src/routes/login.test.tsx`

- [ ] **Step 1: Write login render test**

  ```typescript
  import { describe, it, expect } from "vitest"
  import { render, screen } from "@testing-library/react"
  import LoginPage from "./login"

  // Mock the router dependencies
  vi.mock("@tanstack/react-router", () => ({
    createFileRoute: () => ({ component: LoginPage }),
    Link: ({ children }: { children: React.ReactNode }) => children,
    useNavigate: () => vi.fn(),
  }))

  vi.mock("@/api/hooks/useAuth", () => ({
    useLogin: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    }),
    useUnifiedLogin: () => ({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      reset: vi.fn(),
    }),
  }))

  describe("LoginPage", () => {
    it("renders login form", () => {
      render(<LoginPage />)
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
    })
  })
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add apps/web/src/routes/login.test.tsx
  git commit -m "test(web): add login page component tests"
  ```

### Task 11: Add Web component tests for WidgetSetup

**Files:**
- Create: `apps/web/src/components/widget/WidgetSetup.test.tsx`

- [ ] **Step 1: Write render test**

  ```typescript
  import { describe, it, expect } from "vitest"
  import { render, screen } from "@testing-library/react"
  import { WidgetSetup } from "./WidgetSetup"

  vi.mock("@/api/hooks/useBotConfig", () => ({
    useBotConfig: () => ({ data: null, isLoading: false }),
    useUpdateBotConfig: () => ({ mutateAsync: vi.fn(), isPending: false }),
  }))

  describe("WidgetSetup", () => {
    it("renders setup form", () => {
      render(<WidgetSetup />)
      expect(screen.getByRole("button")).toBeInTheDocument()
    })
  })
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add apps/web/src/components/widget/WidgetSetup.test.tsx
  git commit -m "test(web): add widget setup component tests"
  ```

### Task 12: Run all tests

- [ ] **Step 1: Run API tests**

  ```bash
  cd apps/api && bun test
  ```

- [ ] **Step 2: Run Web tests**

  ```bash
  cd apps/web && bun test
  ```

- [ ] **Step 3: Fix any failures**

- [ ] **Step 4: Final commit**

  ```bash
  git commit -m "test: all integration tests passing" || true
  ```
