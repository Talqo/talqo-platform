import { afterEach, describe, expect, it } from "bun:test"
import { WidgetApi, WidgetApiError } from "./client"
import type { SseEvent } from "./types"

const originalFetch = globalThis.fetch

afterEach(() => {
	globalThis.fetch = originalFetch
})

describe("WidgetApi", () => {
	it("resolves after done even when the transport fails afterward", async () => {
		let pullCount = 0
		globalThis.fetch = (async () =>
			new Response(
				new ReadableStream({
					pull(controller) {
						pullCount += 1
						if (pullCount === 1) {
							controller.enqueue(
								new TextEncoder().encode(
									'event: token\ndata: {"content":"Complete answer"}\n\n' +
										'event: done\ndata: {"id":"assistant-1","conversationId":"conversation-1","role":"assistant","content":"Complete answer","tokenCount":2,"createdAt":"2026-07-16T00:00:00.000Z"}\n\n',
								),
							)
							return
						}
						controller.error(new TypeError("terminated"))
					},
				}),
				{ status: 200 },
			)) as typeof fetch

		const events: SseEvent[] = []
		const api = new WidgetApi({ apiUrl: "https://test", widgetToken: "token" })

		await expect(
			api.sendMessage("session-1", "conversation-1", "hello", (event) =>
				events.push(event),
			),
		).resolves.toBeUndefined()
		expect(events.map((event) => event.type)).toEqual(["token", "done"])
	})

	it("accepts only the first terminal event", async () => {
		globalThis.fetch = (async () =>
			new Response(
				'event: done\ndata: {"id":"assistant-1","conversationId":"conversation-1","role":"assistant","content":"Complete answer","tokenCount":2,"createdAt":"2026-07-16T00:00:00.000Z"}\n\n' +
					'event: error\ndata: {"code":"INTERNAL_ERROR","message":"failed"}\n\n',
				{ status: 200 },
			)) as typeof fetch

		const events: SseEvent[] = []
		const api = new WidgetApi({ apiUrl: "https://test", widgetToken: "token" })
		await api.sendMessage("session-1", "conversation-1", "hello", (event) =>
			events.push(event),
		)

		expect(events.map((event) => event.type)).toEqual(["done"])
	})

	it("preserves structured HTTP error codes", async () => {
		globalThis.fetch = (async () =>
			new Response(
				JSON.stringify({
					error: {
						code: "MONTHLY_LIMIT_REACHED",
						message: "Monthly usage limit reached",
					},
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			)) as typeof fetch

		const api = new WidgetApi({ apiUrl: "https://test", widgetToken: "token" })
		const request = api.startConversation("session-1")

		await expect(request).rejects.toBeInstanceOf(WidgetApiError)
		await expect(request).rejects.toMatchObject({
			code: "MONTHLY_LIMIT_REACHED",
			message: "Monthly usage limit reached",
		})
	})
})
