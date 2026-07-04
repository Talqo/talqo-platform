import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
	testDir: "./tests",
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
		baseURL: process.env.BASE_URL ?? "http://localhost:5173",
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
				baseURL: process.env.WIDGET_URL ?? "http://localhost:5174",
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
