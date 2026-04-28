import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi"
import {
	conversationResponseSchema,
	messageResponseSchema,
	sessionResponseSchema,
} from "db/dto"
import { streamSSE } from "hono/streaming"
import {
	createSessionBodySchema,
	rateConversationBodySchema,
	sendMessageBodySchema,
} from "shared"
import { widgetRateLimit } from "../../common/middleware/widget-rate-limit"
import {
	errorResponseSchema,
	successResponseSchema,
} from "../../common/schemas"
import { widgetService } from "./index"

// ─── Session routes ────────────────────────────────────────────────────────────

export const widgetSessionRoutes = new OpenAPIHono()

widgetSessionRoutes.openapi(
	createRoute({
		method: "post",
		path: "/",
		tags: ["Widget"],
		summary: "Create or resume a browser session",
		security: [{ widgetToken: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: createSessionBodySchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Session created or resumed",
				content: {
					"application/json": {
						schema: successResponseSchema(sessionResponseSchema),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string
		const { browserSessionId } = c.req.valid("json")
		const session = await widgetService.createOrResumeSession(
			clientId,
			browserSessionId,
		)
		return c.json(session, 200)
	},
)

// ─── Conversation routes ───────────────────────────────────────────────────────

export const widgetConversationRoutes = new OpenAPIHono()

widgetConversationRoutes.openapi(
	createRoute({
		method: "post",
		path: "/",
		tags: ["Widget"],
		summary: "Start a new conversation",
		security: [{ widgetToken: [] }],
		request: {
			params: z.object({ sessionId: z.string().uuid() }),
		},
		responses: {
			201: {
				description: "Conversation started",
				content: {
					"application/json": {
						schema: successResponseSchema(conversationResponseSchema),
					},
				},
			},
			404: {
				description: "Session not found",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string
		const sessionId = c.req.valid("param").sessionId
		const conversation = await widgetService.startConversation(
			clientId,
			sessionId,
		)
		return c.json(conversation, 201)
	},
)

widgetConversationRoutes.openapi(
	createRoute({
		method: "patch",
		path: "/:conversationId",
		tags: ["Widget"],
		summary: "Submit satisfaction rating",
		security: [{ widgetToken: [] }],
		request: {
			params: z.object({ conversationId: z.string().uuid() }),
			body: {
				content: {
					"application/json": {
						schema: rateConversationBodySchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Rating submitted",
				content: {
					"application/json": {
						schema: successResponseSchema(conversationResponseSchema),
					},
				},
			},
			404: {
				description: "Conversation not found",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string
		const { conversationId } = c.req.valid("param")
		const { rating } = c.req.valid("json")
		const updated = await widgetService.rateConversation(
			clientId,
			conversationId,
			rating,
		)
		return c.json(updated, 200)
	},
)

// ─── Message routes ────────────────────────────────────────────────────────────

export const widgetMessageRoutes = new OpenAPIHono()

widgetMessageRoutes.use(widgetRateLimit)

widgetMessageRoutes.openapi(
	createRoute({
		method: "get",
		path: "/",
		tags: ["Widget"],
		summary: "Get conversation message history",
		security: [{ widgetToken: [] }],
		request: {
			params: z.object({ conversationId: z.string().uuid() }),
		},
		responses: {
			200: {
				description: "Message history",
				content: {
					"application/json": {
						schema: successResponseSchema(z.array(messageResponseSchema)),
					},
				},
			},
			404: {
				description: "Conversation not found",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string
		const { conversationId } = c.req.valid("param")
		const msgs = await widgetService.getMessageHistory(clientId, conversationId)
		return c.json(msgs, 200)
	},
)

widgetMessageRoutes.openapi(
	createRoute({
		method: "post",
		path: "/",
		tags: ["Widget"],
		summary: "Send a message (streams AI response via SSE)",
		security: [{ widgetToken: [] }],
		request: {
			params: z.object({ conversationId: z.string().uuid() }),
			body: {
				content: {
					"application/json": {
						schema: sendMessageBodySchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: "SSE stream of AI response",
				content: {
					"text/event-stream": {
						schema: z.object({ event: z.string(), data: z.string() }),
					},
				},
			},
			404: {
				description: "Conversation not found",
				content: { "application/json": { schema: errorResponseSchema } },
			},
			429: {
				description: "Rate limit exceeded",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string
		const { conversationId } = c.req.valid("param")
		const { content } = c.req.valid("json")

		const { stream, userMessage, usage, isExternalProvider } =
			await widgetService.sendMessage(clientId, conversationId, content)

		return streamSSE(c, async (sse) => {
			await sse.writeSSE({
				event: "user_message",
				data: JSON.stringify(userMessage),
			})

			let fullContent = ""
			const reader = stream.getReader()

			try {
				while (true) {
					const { done, value } = await reader.read()
					if (done) break

					fullContent += value
					await sse.writeSSE({
						event: "token",
						data: JSON.stringify({ content: value }),
					})
				}
			} catch {
				await reader.cancel().catch(() => {})
				await sse.writeSSE({
					event: "error",
					data: JSON.stringify({
						code: "LLM_ERROR",
						message: "Something went wrong. Please try again.",
					}),
				})
				return
			}

			try {
				const tokensUsed = isExternalProvider ? undefined : await usage
				const assistantMessage = await widgetService.saveAssistantMessage(
					clientId,
					conversationId,
					fullContent,
					tokensUsed,
				)

				await sse.writeSSE({
					event: "done",
					data: JSON.stringify(assistantMessage),
				})
			} catch {
				await sse.writeSSE({
					event: "error",
					data: JSON.stringify({
						code: "PERSISTENCE_ERROR",
						message: "Failed to save response. Please try again.",
					}),
				})
				return
			}
		})
	},
)
