import { expect, test } from "@playwright/test"
import { fillAndSubmitLogin, SEEDED_USERS } from "@/helpers/auth"

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
				// Confirm re-enable in the AlertDialog
				await page
					.getByRole("alertdialog")
					.getByRole("button", { name: "Re-enable" })
					.click()
				await expect(row.getByText("Active")).toBeVisible()
			}
		} catch {
			// best-effort cleanup
		}
	})

	test("admin suspends and re-enables a tenant from the backoffice", async ({
		page,
	}) => {
		await fillAndSubmitLogin(
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

		// Suspend — clicking the table button opens a confirmation dialog
		await tenantRow
			.getByRole("button", { name: "Suspend" })
			.click({ force: true })
		await page
			.getByRole("alertdialog")
			.getByRole("button", { name: "Suspend" })
			.click()
		await expect(tenantRow.getByText("Suspended")).toBeVisible()
		await expect(
			tenantRow.getByRole("button", { name: "Re-enable" }),
		).toBeVisible()

		// Re-enable — same confirmation dialog pattern
		await tenantRow
			.getByRole("button", { name: "Re-enable" })
			.click({ force: true })
		await page
			.getByRole("alertdialog")
			.getByRole("button", { name: "Re-enable" })
			.click()
		await expect(tenantRow.getByText("Active")).toBeVisible()
		await expect(
			tenantRow.getByRole("button", { name: "Suspend" }),
		).toBeVisible()
	})
})
