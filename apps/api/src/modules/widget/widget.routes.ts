import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi"
import {
	conversationResponseSchema,
	messageResponseSchema,
	sessionResponseSchema,
} from "db/dto"
import {
	createSessionBodySchema,
	rateConversationBodySchema,
	sendMessageBodySchema,
} from "shared"
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
		return c.json({ success: true as const, data: session }, 200)
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
		// sessionId is always defined when mounted at /widget/:clientId/sessions/:sessionId/conversations
		const sessionId = c.req.param("sessionId") as string
		const conversation = await widgetService.startConversation(
			clientId,
			sessionId,
		)
		return c.json({ success: true as const, data: conversation }, 201)
	},
)

widgetConversationRoutes.openapi(
	createRoute({
		method: "delete",
		path: "/:conversationId",
		tags: ["Widget"],
		summary: "Reset (delete) a conversation",
		security: [{ widgetToken: [] }],
		request: {
			params: z.object({ conversationId: z.string().uuid() }),
		},
		responses: {
			200: {
				description: "Conversation reset",
				content: {
					"application/json": {
						schema: successResponseSchema(z.object({ message: z.string() })),
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
		await widgetService.resetConversation(clientId, conversationId)
		return c.json(
			{ success: true as const, data: { message: "Conversation reset" } },
			200,
		)
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
		return c.json({ success: true as const, data: updated }, 200)
	},
)

// ─── Message routes ────────────────────────────────────────────────────────────

export const widgetMessageRoutes = new OpenAPIHono()

widgetMessageRoutes.openapi(
	createRoute({
		method: "get",
		path: "/",
		tags: ["Widget"],
		summary: "Get conversation message history",
		security: [{ widgetToken: [] }],
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
		// conversationId is always defined when mounted at /.../conversations/:conversationId/messages
		const conversationId = c.req.param("conversationId") as string
		const msgs = await widgetService.getMessageHistory(clientId, conversationId)
		return c.json({ success: true as const, data: msgs }, 200)
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
				description: "Message sent and assistant response returned",
				content: {
					"application/json": {
						schema: successResponseSchema(
							z.object({
								userMessage: messageResponseSchema,
								assistantMessage: messageResponseSchema,
							}),
						),
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
		const conversationId = c.req.param("conversationId") as string
		const { content } = c.req.valid("json")
		const result = await widgetService.sendMessage(
			clientId,
			conversationId,
			content,
		)
		return c.json({ success: true as const, data: result }, 200)
	},
)
