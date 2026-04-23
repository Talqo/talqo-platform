import { expect, test } from "@playwright/test"
import { fillAndSubmitAdminLogin } from "../helpers/admin"
import { SEEDED_USERS } from "../helpers/auth"

test.describe("Admin suspend and re-enable tenant", () => {
	test("admin suspends and re-enables a tenant from the backoffice", async ({
		page,
	}) => {
		await fillAndSubmitAdminLogin(
			page,
			SEEDED_USERS.admin.email,
			SEEDED_USERS.admin.password,
		)
		await expect(page).toHaveURL(/\/backoffice/)

		// Find the first active tenant row (Acme Corp)
		const tenantRow = page.locator("tr", {
			hasText: "Acme Corp",
		})
		await expect(tenantRow).toBeVisible()
		await expect(tenantRow.getByText("Active")).toBeVisible()

		// Suspend
		await tenantRow.getByRole("button", { name: "Suspend" }).click()
		await expect(tenantRow.getByText("Suspended")).toBeVisible()
		await expect(
			tenantRow.getByRole("button", { name: "Re-enable" }),
		).toBeVisible()

		// Re-enable
		await tenantRow.getByRole("button", { name: "Re-enable" }).click()
		await expect(tenantRow.getByText("Active")).toBeVisible()
		await expect(
			tenantRow.getByRole("button", { name: "Suspend" }),
		).toBeVisible()
	})
})
