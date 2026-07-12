import { expect, test } from "@playwright/test"
import {
	CLIENT_AUTH_FILE,
	fillAndSubmitLogin,
	SEEDED_USERS,
} from "@/helpers/auth"

const NEW_PASSWORD = "newpass123"

test.use({ storageState: CLIENT_AUTH_FILE })

test.describe("Change password flow", () => {
	test.afterEach(async ({ page }) => {
		// Test body invalidated the page's JWT (tokenVersion bump) — re-login
		// with the new password to get a fresh JWT, then revert.
		await fillAndSubmitLogin(page, SEEDED_USERS.client.email, NEW_PASSWORD)
		await expect(page).toHaveURL(/\/dashboard/)

		await page.getByTestId("nav-settings").click({ force: true })
		await expect(
			page.getByRole("heading", { name: "Account Details" }),
		).toBeVisible()

		await page.getByLabel("Current Password").fill(NEW_PASSWORD)
		await page
			.getByLabel("New Password", { exact: true })
			.fill(SEEDED_USERS.client.password)
		await page
			.getByLabel("Confirm New Password")
			.fill(SEEDED_USERS.client.password)

		await page
			.getByRole("button", { name: "Change Password" })
			.click({ force: true })

		await expect(page.getByText("Password changed successfully")).toBeVisible()
	})

	test("client navigates to settings and changes password", async ({
		page,
	}) => {
		await page.goto("/dashboard")
		await expect(page.getByTestId("nav-settings")).toBeVisible()

		await page.getByTestId("nav-settings").click({ force: true })
		await expect(page).toHaveURL(/\/dashboard\/settings/)

		await expect(
			page.getByRole("heading", { name: "Account Details" }),
		).toBeVisible()

		await page.getByLabel("Current Password").fill(SEEDED_USERS.client.password)
		await page.getByLabel("New Password", { exact: true }).fill(NEW_PASSWORD)
		await page.getByLabel("Confirm New Password").fill(NEW_PASSWORD)

		await page
			.getByRole("button", { name: "Change Password" })
			.click({ force: true })

		await expect(page.getByText("Password changed successfully")).toBeVisible()

		await expect(page.getByLabel("Current Password")).toHaveValue("")
		await expect(page.getByLabel("New Password", { exact: true })).toHaveValue(
			"",
		)
		await expect(page.getByLabel("Confirm New Password")).toHaveValue("")
	})
})
