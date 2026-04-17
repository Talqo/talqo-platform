import { expect, test } from "@playwright/test"
import { fillAndSubmitLogin, SEEDED_USERS } from "../helpers/auth"

test.describe("Login flow", () => {
	test("homepage has a Log in link that navigates to /login", async ({
		page,
	}) => {
		await page.goto("/")
		const loginLink = page.getByRole("link", { name: "Log in" })
		await expect(loginLink).toBeVisible()

		await loginLink.click()
		await expect(page).toHaveURL(/\/login/)
		await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible()
	})

	test("client logs in and is redirected to /dashboard", async ({ page }) => {
		await fillAndSubmitLogin(
			page,
			SEEDED_USERS.client.email,
			SEEDED_USERS.client.password,
		)
		await expect(page).toHaveURL(/\/dashboard/)
	})

	test("invalid credentials show an error and stay on /login", async ({
		page,
	}) => {
		await fillAndSubmitLogin(page, "nobody@example.com", "wrongpassword")

		await expect(page).toHaveURL(/\/login/)
		await expect(page.getByText("Invalid credentials")).toBeVisible()
	})
})
