import path from "node:path"
import { defineConfig, devices } from "@playwright/test"

// CommonJS transform (no "type": "module") — use ambient __dirname; import.meta.url throws here.

// Ports come from make e2e's exported env; fall back to defaults for bare test:run.
const baseURL = process.env.BASE_URL ?? "http://localhost:5173"
const widgetURL = process.env.WIDGET_URL ?? "http://localhost:5174"
const apiOrigin = new URL(
	process.env.VITE_API_URL ?? "http://localhost:3000/v1",
).origin

export default defineConfig({
	testDir: "./tests",
	// Servers inherit make e2e's exported env, overriding their .env.example defaults.
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
		// argon2id login is CPU-heavy; concurrent workers can queue past the 5s default.
		timeout: 10000,
	},
	use: {
		baseURL,
		// Capture trace on first retry to ease debugging
		trace: "on-first-retry",
		// "stable" checks hang in Docker/WSL (rAF never settles); force-clicks bypass them.
		actionTimeout: 15000,
	},
	projects: [
		{
			// Logs in as client and admin, saving sessions to tests/.auth/*.json for chromium to reuse.
			name: "setup",
			testDir: "./tests",
			testMatch: "**/*.setup.ts",
		},
		{
			name: "chromium",
			testDir: "./tests",
			// change-password invalidates the shared client JWT; isolate it below.
			testIgnore: [
				"**/widget/**",
				"**/*.setup.ts",
				"**/change-password.spec.ts",
			],
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
			// Runs after chromium so JWT invalidation can't poison parallel specs.
			name: "chromium-password",
			testDir: "./tests",
			testMatch: "**/change-password.spec.ts",
			dependencies: ["chromium"],
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
			// Widget bundle runs on its own origin (packages/widget preview).
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
