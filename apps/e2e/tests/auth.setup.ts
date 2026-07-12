import { expect, test as setup } from "@playwright/test"
import {
	ADMIN_AUTH_FILE,
	CLIENT_AUTH_FILE,
	fillAndSubmitLogin,
	SEEDED_USERS,
} from "@/helpers/auth"

// Logs in once per account and saves the authenticated session to disk.
// Every other spec reuses these via `test.use({ storageState: ... })`
// instead of re-running the real login UI flow (and its argon2id hash)
// in every single test — that redundant per-test login was the cause of
// occasional "stuck on /login" flakes under parallel workers.

setup("authenticate as client", async ({ page }) => {
	await fillAndSubmitLogin(
		page,
		SEEDED_USERS.client.email,
		SEEDED_USERS.client.password,
	)
	await expect(page).toHaveURL(/\/dashboard/)
	await page.context().storageState({ path: CLIENT_AUTH_FILE })
})

setup("authenticate as admin", async ({ page }) => {
	await fillAndSubmitLogin(
		page,
		SEEDED_USERS.admin.email,
		SEEDED_USERS.admin.password,
	)
	await expect(page).toHaveURL(/\/backoffice/)
	await page.context().storageState({ path: ADMIN_AUTH_FILE })
})
