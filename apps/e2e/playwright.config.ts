import path from "node:path"
import { defineConfig, devices } from "@playwright/test"

// Playwright transforms this package to CommonJS (no "type": "module"), so use the
// ambient __dirname — import.meta.url throws "exports is not defined" here (see
// tests/helpers/global-setup.ts).

// Ports are branch-derived per worktree (make e2e exports them); fall back to the
// canonical defaults so a bare `bun run test:run` still targets a local stack.
const baseURL = process.env.BASE_URL ?? "http://localhost:5173"
const widgetURL = process.env.WIDGET_URL ?? "http://localhost:5174"
const apiOrigin = new URL(
	process.env.VITE_API_URL ?? "http://localhost:3000/v1",
).origin

export default defineConfig({
	testDir: "./tests",
	// The API/web/widget servers inherit make e2e's exported env (ports, APP_URL,
	// ALLOWED_ORIGINS, DB creds), overriding the .env.example defaults they load.
	webServer: [
		{
			command: "bun --env-file=../../.env.example src/index.ts",
			cwd: path.resolve(__dirname, "../api"),
			url: `${apiOrigin}/health`,
			reuseExistingServer: false,
			timeout: 60_000,
		},
		{
			command: `bun run preview -- --port ${new URL(baseURL).port} --strictPort`,
			cwd: path.resolve(__dirname, "../web"),
			url: baseURL,
			reuseExistingServer: false,
			timeout: 60_000,
		},
		{
			command: `bun run preview -- --port ${new URL(widgetURL).port} --strictPort`,
			cwd: path.resolve(__dirname, "../../packages/widget"),
			url: widgetURL,
			reuseExistingServer: false,
			timeout: 60_000,
		},
	],
	fullyParallel: true,
	// Fail CI fast if a test is accidentally left with `.only`
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	// Shared seeded users — cap parallelism on CI to prevent cross-spec race conditions
	workers: process.env.CI ? 1 : undefined,
	globalSetup: "./tests/helpers/global-setup.ts",
	reporter: process.env.CI ? "github" : "html",
	expect: {
		// Login uses argon2id (Bun.password.verify) — deliberately CPU/memory
		// heavy. Concurrent workers hitting the same seeded account's login can
		// queue up past the 5s default, especially on a busy local machine.
		timeout: 10000,
	},
	use: {
		baseURL,
		// Capture trace on first retry to ease debugging
		trace: "on-first-retry",
		// Disable "stable" position checks, which hang inside Docker/WSL
		// because the rAF-based stability heuristic never settles.
		// Tests navigate and wait explicitly, so this is safe.
		actionTimeout: 15000,
	},
	projects: [
		{
			// Logs in once as client and as admin, saving each session to
			// tests/.auth/*.json for the chromium project to reuse.
			name: "setup",
			testDir: "./tests",
			testMatch: "**/*.setup.ts",
		},
		{
			name: "chromium",
			testDir: "./tests",
			testIgnore: ["**/widget/**", "**/*.setup.ts"],
			dependencies: ["setup"],
			use: {
				...devices["Desktop Chrome"],
				launchOptions: {
					args: [
						"--no-sandbox",
						"--disable-setuid-sandbox",
						"--disable-gpu",
						"--disable-dev-shm-usage",
					],
				},
			},
		},
		{
			// Widget bundle runs on its own origin (packages/widget's preview
			// server), separate from the apps/web preview above.
			name: "widget",
			testDir: "./tests/widget",
			use: {
				...devices["Desktop Chrome"],
				baseURL: widgetURL,
				launchOptions: {
					args: [
						"--no-sandbox",
						"--disable-setuid-sandbox",
						"--disable-gpu",
						"--disable-dev-shm-usage",
					],
				},
			},
		},
	],
})
