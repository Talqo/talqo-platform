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

	test("client adds free beta credit without payment details", async ({
		page,
	}) => {
		await page
			.getByRole("link", { name: "Add Free Credit" })
			.click({ force: true })
		await expect(page).toHaveURL(/\/dashboard\/add-funds/)
		await expect(
			page.getByText("Free during early access", { exact: true }),
		).toBeVisible()
		await expect(page.getByLabel("Card Number")).toHaveCount(0)

		await page.getByPlaceholder("0.00").fill("50")

		await page
			.getByRole("button", { name: "Add $50.00 free credit" })
			.click({ force: true })
		await expect(
			page.getByText("Free credit added! Redirecting...", {
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
