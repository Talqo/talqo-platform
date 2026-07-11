import { expect, test } from "@playwright/test"
import { CLIENT_AUTH_FILE } from "@/helpers/auth"

test.use({ storageState: CLIENT_AUTH_FILE })

test.describe("Client dashboard features", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/dashboard")
	})

	test("client updates bot configuration", async ({ page }) => {
		await page
			.getByRole("link", { name: "Bot Configuration" })
			.click({ force: true })
		await expect(page).toHaveURL(/\/dashboard\/bot-config/)
		await expect(
			page.getByRole("heading", { name: "Bot Personality & Behavior" }),
		).toBeVisible()

		const systemPromptField = page.getByLabel("System Prompt")
		await systemPromptField.fill("You are a helpful assistant for Acme Corp.")

		await page
			.getByRole("button", { name: "Save Configuration" })
			.click({ force: true })
		await expect(
			page.getByText("Configuration saved.", { exact: true }),
		).toBeVisible()
	})

	test("client adds funds", async ({ page }) => {
		await page.getByRole("link", { name: "Add Funds" }).click({ force: true })
		await expect(page).toHaveURL(/\/dashboard\/add-funds/)

		await page.getByPlaceholder("0.00").fill("50")
		await page.getByLabel("Card Number").fill("4242 4242 4242 4242")
		await page.getByLabel("Expiry").fill("12/30")
		await page.getByLabel("CVV").fill("123")
		await page.getByLabel("Name on Card").fill("Test User")

		await page
			.getByRole("button", { name: "Pay $50.00" })
			.click({ force: true })
		await expect(
			page.getByText("Funds added successfully! Redirecting...", {
				exact: true,
			}),
		).toBeVisible()
	})

	test("widget preview shows initial welcome message", async ({ page }) => {
		await page.getByTestId("nav-widget-setup").click({ force: true })
		await expect(page).toHaveURL(/\/dashboard\/widget-setup/)
		await expect(page.getByTestId("widget-setup-heading")).toBeVisible()

		const previewCardHeading = page.getByTestId("live-preview-heading")
		await expect(previewCardHeading).toBeVisible()

		const previewCard = page.getByTestId("live-preview-card")
		await expect(
			previewCard.getByText("Hi! How can I help you today?", {
				exact: true,
			}),
		).toBeVisible()

		const botNameInput = page.getByLabel("Bot Name")
		await botNameInput.fill("Support Bot")
		await expect(
			previewCard.getByText("Support Bot", { exact: true }),
		).toBeVisible()
	})
})
