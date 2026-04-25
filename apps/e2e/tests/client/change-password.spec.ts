import { expect, test } from "@playwright/test"
import { fillAndSubmitLogin, SEEDED_USERS } from "../helpers/auth"

test.describe.configure({ mode: "serial" })

test.describe("Change password flow", () => {
	test.afterEach(async ({ page }) => {
		// Revert password to the seeded value so the test stays idempotent
		await page.getByLabel("Current Password").fill("newpass123")
		await page
			.getByLabel("New Password", { exact: true })
			.fill(SEEDED_USERS.client.password)
		await page
			.getByLabel("Confirm New Password")
			.fill(SEEDED_USERS.client.password)

		await page.getByRole("button", { name: "Change Password" }).click()

		// Wait for the revert mutation to finish (button exits pending state)
		await expect(
			page.getByRole("button", { name: "Change Password" }),
		).toBeEnabled()

		await expect(page.getByText("Password changed successfully")).toBeVisible()
	})

	test("client logs in, navigates to settings, and changes password", async ({
		page,
	}) => {
		await fillAndSubmitLogin(
			page,
			SEEDED_USERS.client.email,
			SEEDED_USERS.client.password,
		)
		await expect(page).toHaveURL(/\/dashboard/)

		await page.getByRole("link", { name: "Settings" }).click()
		await expect(page).toHaveURL(/\/dashboard\/settings/)

		await expect(
			page.getByRole("heading", { name: "Account Details" }),
		).toBeVisible()

		await page.getByLabel("Current Password").fill(SEEDED_USERS.client.password)
		await page.getByLabel("New Password", { exact: true }).fill("newpass123")
		await page.getByLabel("Confirm New Password").fill("newpass123")

		await page.getByRole("button", { name: "Change Password" }).click()

		await expect(page.getByText("Password changed successfully")).toBeVisible()

		await expect(page.getByLabel("Current Password")).toHaveValue("")
		await expect(page.getByLabel("New Password", { exact: true })).toHaveValue(
			"",
		)
		await expect(page.getByLabel("Confirm New Password")).toHaveValue("")
	})
})
