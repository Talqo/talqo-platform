import { expect, test } from "@playwright/test"
import { fillAndSubmitLogin, SEEDED_USERS } from "../helpers/auth"

test.describe("Client dashboard features", () => {
	test.beforeEach(async ({ page }) => {
		await fillAndSubmitLogin(
			page,
			SEEDED_USERS.client.email,
			SEEDED_USERS.client.password,
		)
		await expect(page).toHaveURL(/\/dashboard/)
	})

	test("client updates bot configuration", async ({ page }) => {
		await page.getByRole("link", { name: "Bot Configuration" }).click()
		await expect(page).toHaveURL(/\/dashboard\/bot-config/)
		await expect(
			page.getByRole("heading", { name: "Bot Personality & Behavior" }),
		).toBeVisible()

		const systemPromptField = page.getByLabel("System Prompt")
		await systemPromptField.fill("You are a helpful assistant for Acme Corp.")

		await page.getByRole("button", { name: "Save Configuration" }).click()
		await expect(
			page.getByText("Configuration saved.", { exact: true }),
		).toBeVisible()
	})

	test("client adds funds", async ({ page }) => {
		await page.getByRole("link", { name: "Add Funds" }).click()
		await expect(page).toHaveURL(/\/dashboard\/add-funds/)
		await expect(page.getByRole("heading", { name: "Add Funds" })).toBeVisible()

		await page.getByLabel("Amount (USD)").fill("50")
		await page.getByLabel("Card Number").fill("4242 4242 4242 4242")
		await page.getByLabel("Expiry").fill("12/30")
		await page.getByLabel("CVV").fill("123")
		await page.getByLabel("Name on Card").fill("Test User")

		await page.getByRole("button", { name: "Pay $50.00" }).click()
		await expect(
			page.getByText("Funds added successfully! Redirecting...", {
				exact: true,
			}),
		).toBeVisible()
	})

	test("widget preview shows initial welcome message", async ({ page }) => {
		await page.getByRole("link", { name: "Widget Setup" }).click()
		await expect(page).toHaveURL(/\/dashboard\/widget-setup/)
		await expect(
			page.getByRole("heading", { name: "Widget Setup" }),
		).toBeVisible()

		await expect(
			page.getByRole("heading", { name: "Live Preview" }),
		).toBeVisible()

		const previewCard = page
			.locator("div.rounded-xl.border")
			.filter({ hasText: "Live Preview" })
			.first()
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
