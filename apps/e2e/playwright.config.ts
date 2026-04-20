import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	// Fail CI fast if a test is accidentally left with `.only`
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? "github" : "html",
	use: {
		baseURL: process.env.BASE_URL ?? "http://localhost:5173",
		// Capture trace on first retry to ease debugging
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
})
