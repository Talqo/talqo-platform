import { expect, type Page, test } from "@playwright/test"
import { CLIENT_AUTH_FILE } from "@/helpers/auth"

test.use({ storageState: CLIENT_AUTH_FILE })

test.describe("Client billing", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/dashboard")
	})

	test.describe("Add funds validation", () => {
		// Happy path is covered by dashboard-features.spec.ts — these only
		// exercise the addFundsBodySchema boundaries, which have no
		// unit/integration test coverage today.
		async function fillAddFundsForm(page: Page, amount: string) {
			await page.getByRole("link", { name: "Add Funds" }).click({ force: true })
			await expect(page).toHaveURL(/\/dashboard\/add-funds/)

			// The amount input's shadcn FormLabel isn't programmatically
			// associated with the <input> (no working aria-label/for), so
			// getByLabel never resolves — match dashboard-features.spec.ts's
			// existing workaround of targeting the placeholder instead.
			await page.getByPlaceholder("0.00").fill(amount)
			await page.getByLabel("Card Number").fill("4242 4242 4242 4242")
			await page.getByLabel("Expiry").fill("12/30")
			await page.getByLabel("CVV").fill("123")
			await page.getByLabel("Name on Card").fill("Test User")
			await page.getByRole("button", { name: /Pay \$/ }).click({ force: true })
		}

		test("rejects an amount over the $10,000 cap", async ({ page }) => {
			await fillAddFundsForm(page, "10001")

			await expect(page).toHaveURL(/\/dashboard\/add-funds/)
			await expect(
				page.getByText("Funds added successfully!", { exact: false }),
			).not.toBeVisible()
		})

		test("rejects a zero or negative amount", async ({ page }) => {
			await fillAddFundsForm(page, "-5")

			await expect(page).toHaveURL(/\/dashboard\/add-funds/)
			await expect(
				page.getByText("Funds added successfully!", { exact: false }),
			).not.toBeVisible()
		})
	})

	// Serialized — both tests read/write Acme Corp's shared monthlyUsageLimit
	// and usageAlertThresholdUsd, so running them concurrently would race.
	test.describe
		.serial("Billing settings", () => {
			test.afterEach(async ({ page }) => {
				// Restore the seeded baseline (limit=$50, alert threshold=$40 i.e.
				// enabled) so this suite is idempotent across repeated runs.
				try {
					await page.goto("/dashboard/settings?tab=billing")
					await expect(
						page.getByRole("heading", { name: "Usage & Limits" }),
					).toBeVisible()
					await page.getByLabel("Monthly Limit (USD)").fill("50")
					const usageAlertsSwitch = page.getByRole("switch", {
						name: "Usage Alerts",
					})
					if (!(await usageAlertsSwitch.isChecked())) {
						await usageAlertsSwitch.click({ force: true })
					}
					await Promise.all([
						page.waitForResponse(
							(res) =>
								res.url().includes("/client/me/usage-limit") &&
								res.request().method() === "PATCH",
						),
						page.getByRole("button", { name: "Save Settings" }).click({
							force: true,
						}),
					])
				} catch {
					// best-effort cleanup
				}
			})

			test("updates monthly usage limit and usage alert, persisted across reload", async ({
				page,
			}) => {
				await page.getByTestId("nav-settings").click({ force: true })
				await page.getByRole("tab", { name: "Billing" }).click({ force: true })
				await expect(
					page.getByRole("heading", { name: "Usage & Limits" }),
				).toBeVisible()

				await page.getByLabel("Monthly Limit (USD)").fill("200")
				const usageAlertsSwitch = page.getByRole("switch", {
					name: "Usage Alerts",
				})
				if (await usageAlertsSwitch.isChecked()) {
					await usageAlertsSwitch.click({ force: true })
				}

				await Promise.all([
					page.waitForResponse(
						(res) =>
							res.url().includes("/client/me/usage-limit") &&
							res.request().method() === "PATCH",
					),
					page.getByRole("button", { name: "Save Settings" }).click({
						force: true,
					}),
				])

				await page.reload()
				await expect(page.getByLabel("Monthly Limit (USD)")).toHaveValue("200")
				await expect(
					page.getByRole("switch", { name: "Usage Alerts" }),
				).not.toBeChecked()
			})

			test("rejects a monthly limit outside $1-$10,000", async ({ page }) => {
				await page.getByTestId("nav-settings").click({ force: true })
				await page.getByRole("tab", { name: "Billing" }).click({ force: true })
				await expect(
					page.getByRole("heading", { name: "Usage & Limits" }),
				).toBeVisible()

				await page.getByLabel("Monthly Limit (USD)").fill("10001")
				await page
					.getByRole("button", { name: "Save Settings" })
					.click({ force: true })

				// Client-side validation blocks the save — value is never persisted.
				await page.reload()
				await expect(page.getByLabel("Monthly Limit (USD)")).not.toHaveValue(
					"10001",
				)
			})
		})
})
