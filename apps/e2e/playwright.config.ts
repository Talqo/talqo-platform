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
			name: "chromium",
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
	],
})
