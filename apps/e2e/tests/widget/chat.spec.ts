import { expect, type Page, test } from "@playwright/test"

// Sending a real message triggers a live LLM call via the agent module, and
// no default provider credentials are seeded for e2e (BYOK model — see
// apps/api/src/modules/agent/agent.provider.ts). Only this endpoint is
// mocked; session/conversation creation and rating submission are real
// requests against the running API.
const MESSAGES_ENDPOINT =
	/\/widget\/sessions\/[^/]+\/conversations\/[^/]+\/messages$/

function buildSseBody(conversationId: string, assistantReply: string) {
	const now = new Date().toISOString()
	const events = [
		{
			event: "user_message",
			data: {
				id: `msg-user-${Date.now()}`,
				conversationId,
				role: "user",
				content: "Hello there",
				tokenCount: 2,
				createdAt: now,
			},
		},
		{ event: "token", data: { content: assistantReply.slice(0, 4) } },
		{ event: "token", data: { content: assistantReply.slice(4) } },
		{
			event: "done",
			data: {
				id: `msg-assistant-${Date.now()}`,
				conversationId,
				role: "assistant",
				content: assistantReply,
				tokenCount: 6,
				createdAt: now,
			},
		},
	]
	return events
		.map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`)
		.join("")
}

async function mockAssistantReply(
	page: Page,
	assistantReply: string,
	delayMs = 0,
) {
	await page.route(MESSAGES_ENDPOINT, async (route) => {
		if (route.request().method() !== "POST") {
			await route.continue()
			return
		}
		if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs))
		const conversationId =
			route.request().url().split("/conversations/")[1]?.split("/")[0] ?? "conv"
		await route.fulfill({
			status: 200,
			contentType: "text/event-stream",
			body: buildSseBody(conversationId, assistantReply),
		})
	})
}

test.describe("Widget chat", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/")
		await expect(page.getByRole("button", { name: "Open chat" })).toBeVisible()
	})

	test("trigger opens and closes the chat panel", async ({ page }) => {
		await page.getByRole("button", { name: "Open chat" }).click()
		const panel = page.getByRole("dialog")
		await expect(panel).toBeVisible()
		await expect(panel.getByText("Hi! How can I help you today?")).toBeVisible()

		await page.getByRole("button", { name: "Close" }).click()
		await expect(panel).not.toBeVisible()
	})

	test("sends a message and renders the streamed markdown response", async ({
		page,
	}) => {
		await mockAssistantReply(page, "**Hi!** How can I help?", 300)
		await page.getByRole("button", { name: "Open chat" }).click()

		await page.getByLabel("Type your message").fill("Hello there")
		await page.getByRole("button", { name: "Send message" }).click()

		await expect(page.getByText("Assistant is typing")).toBeVisible()
		await expect(page.locator(".aiw-markdown strong")).toHaveText("Hi!")
		await expect(page.getByText("How can I help?")).toBeVisible()
	})

	test("clear conversation resets the message list", async ({ page }) => {
		await mockAssistantReply(page, "Sure, here is some help.")
		await page.getByRole("button", { name: "Open chat" }).click()

		await page.getByLabel("Type your message").fill("Hello there")
		await page.getByRole("button", { name: "Send message" }).click()
		await expect(page.getByText("Sure, here is some help.")).toBeVisible()

		await page.getByRole("button", { name: "Clear conversation" }).click()
		await expect(page.getByText("Sure, here is some help.")).not.toBeVisible()
		await expect(page.getByText("Hi! How can I help you today?")).toBeVisible()
	})

	test("shows a rating prompt after a response and submits it", async ({
		page,
	}) => {
		await mockAssistantReply(page, "Glad to help.")
		await page.getByRole("button", { name: "Open chat" }).click()

		await page.getByLabel("Type your message").fill("Hello there")
		await page.getByRole("button", { name: "Send message" }).click()
		await expect(page.getByText("Glad to help.")).toBeVisible()

		await expect(page.getByText("Rate this conversation")).toBeVisible()
		await page.getByRole("button", { name: "Rate 5 stars" }).click()
		await expect(page.getByText("Thank you for your feedback!")).toBeVisible()
		await expect(
			page.getByRole("button", { name: "Rate 5 stars" }),
		).toBeDisabled()
	})

	test("theme toggle persists across a page reload", async ({ page }) => {
		await page.getByRole("button", { name: "Open chat" }).click()
		const toggle = page.getByRole("button", { name: "Switch to dark mode" })
		await expect(toggle).toBeVisible()
		await toggle.click()
		await expect(page.locator(".aiw-root")).toHaveAttribute(
			"data-theme",
			"dark",
		)

		await page.reload()
		await expect(page.locator(".aiw-root")).toHaveAttribute(
			"data-theme",
			"dark",
		)
	})

	test("resizes via the header drag handle and the corner handle", async ({
		page,
	}) => {
		await page.getByRole("button", { name: "Open chat" }).click()
		const panel = page.getByRole("dialog")
		const initialBox = await panel.boundingBox()
		if (!initialBox) throw new Error("Widget panel has no bounding box")

		const header = page.locator(".aiw-header")
		const headerBox = await header.boundingBox()
		if (!headerBox) throw new Error("Widget header has no bounding box")
		const headerStart = {
			x: headerBox.x + 20,
			y: headerBox.y + headerBox.height / 2,
		}
		await page.mouse.move(headerStart.x, headerStart.y)
		await page.mouse.down()
		await page.mouse.move(headerStart.x - 100, headerStart.y - 100, {
			steps: 5,
		})
		await page.mouse.up()

		const afterHeaderDrag = await panel.boundingBox()
		if (!afterHeaderDrag) throw new Error("Widget panel has no bounding box")
		expect(afterHeaderDrag.width).toBeGreaterThan(initialBox.width + 20)

		const corner = page.locator(".aiw-resize-corner")
		const cornerBox = await corner.boundingBox()
		if (!cornerBox) throw new Error("Resize corner has no bounding box")
		const cornerStart = {
			x: cornerBox.x + cornerBox.width / 2,
			y: cornerBox.y + cornerBox.height / 2,
		}
		await page.mouse.move(cornerStart.x, cornerStart.y)
		await page.mouse.down()
		await page.mouse.move(cornerStart.x - 60, cornerStart.y - 60, {
			steps: 5,
		})
		await page.mouse.up()

		const afterCornerDrag = await panel.boundingBox()
		if (!afterCornerDrag) throw new Error("Widget panel has no bounding box")
		expect(afterCornerDrag.height).toBeGreaterThan(afterHeaderDrag.height + 10)
	})
})
