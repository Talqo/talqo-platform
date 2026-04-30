import { expect, test } from "@playwright/test"
import { fillAndSubmitAdminLogin } from "../helpers/admin"
import { SEEDED_USERS } from "../helpers/auth"

test.describe("Admin suspend and re-enable tenant", () => {
	test.afterEach(async ({ page }) => {
		// Ensure TechStartup is always re-enabled so parallel tests using
		// the same seeded client do not hit 401 on shared server state.
		try {
			await page.goto("/backoffice")
			const row = page.locator("tr", { hasText: "TechStartup" })
			const reEnableBtn = row.getByRole("button", { name: "Re-enable" }).first()
			const isVisible = await reEnableBtn.isVisible().catch(() => false)
			if (isVisible) {
				await reEnableBtn.click({ force: true })
				await expect(row.getByText("Active")).toBeVisible()
			}
		} catch {
			// best-effort cleanup
		}
	})

	test("admin suspends and re-enables a tenant from the backoffice", async ({
		page,
	}) => {
		await fillAndSubmitAdminLogin(
			page,
			SEEDED_USERS.admin.email,
			SEEDED_USERS.admin.password,
		)
		await expect(page).toHaveURL(/\/backoffice/)

		// Find the active tenant row (TechStartup) — NOT Acme Corp,
		// because Acme Corp is used concurrently by client dashboard tests.
		const tenantRow = page.locator("tr", {
			hasText: "TechStartup",
		})
		await expect(tenantRow).toBeVisible()
		await expect(tenantRow.getByText("Active")).toBeVisible()

		// Suspend
		await tenantRow
			.getByRole("button", { name: "Suspend" })
			.click({ force: true })
		await expect(tenantRow.getByText("Suspended")).toBeVisible()
		await expect(
			tenantRow.getByRole("button", { name: "Re-enable" }),
		).toBeVisible()

		// Re-enable
		await tenantRow
			.getByRole("button", { name: "Re-enable" })
			.click({ force: true })
		await expect(tenantRow.getByText("Active")).toBeVisible()
		await expect(
			tenantRow.getByRole("button", { name: "Suspend" }),
		).toBeVisible()
	})
})
