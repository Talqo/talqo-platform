import type { Page } from "@playwright/test"

/** Credentials from the seed script (apps/api/src/db/seed.ts) */
export const SEEDED_USERS = {
	client: { email: "acme@talqo.dev", password: "client123" },
	admin: { email: "admin@talqo.dev", password: "admin123" },
} as const

/** Saved sessions from tests/auth.setup.ts, reused via test.use({ storageState }) */
export const CLIENT_AUTH_FILE = "tests/.auth/client.json"
export const ADMIN_AUTH_FILE = "tests/.auth/admin.json"

/**
 * Navigate directly to /login, fill in credentials, and submit.
 * Does not assert the outcome — callers decide what to expect.
 */
export async function fillAndSubmitLogin(
	page: Page,
	email: string,
	password: string,
) {
	await page.goto("/login")
	await page.getByLabel("Email").fill(email)
	await page.getByLabel("Password").fill(password)
	await page.getByRole("button", { name: "Log in" }).click({ force: true })
}
