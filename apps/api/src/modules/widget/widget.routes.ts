import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
	errorResponseSchema,
	successResponseSchema,
} from "../../common/schemas";
import { widgetService } from "./index";

// ─── Shared schemas ────────────────────────────────────────────────────────────

const sessionSchema = z.object({
	id: z.string().uuid(),
	clientId: z.string().uuid(),
	browserSessionId: z.string(),
	createdAt: z.string(),
	lastActiveAt: z.string(),
});

const conversationSchema = z.object({
	id: z.string().uuid(),
	sessionId: z.string().uuid(),
	clientId: z.string().uuid(),
	startedAt: z.string(),
	satisfactionRating: z.number().nullable(),
});

const messageSchema = z.object({
	id: z.string().uuid(),
	conversationId: z.string().uuid(),
	role: z.string(),
	content: z.string(),
	tokenCount: z.number(),
	createdAt: z.string(),
});

// ─── Session routes ────────────────────────────────────────────────────────────

export const widgetSessionRoutes = new OpenAPIHono();

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
						schema: z.object({ browserSessionId: z.string().min(1) }),
					},
				},
			},
		},
		responses: {
			200: {
				description: "Session created or resumed",
				content: {
					"application/json": { schema: successResponseSchema(sessionSchema) },
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string;
		const { browserSessionId } = c.req.valid("json");
		const session = await widgetService.createOrResumeSession(
			clientId,
			browserSessionId,
		);
		return c.json({ success: true as const, data: session }, 200);
	},
);

// ─── Conversation routes ───────────────────────────────────────────────────────

export const widgetConversationRoutes = new OpenAPIHono();

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
						schema: successResponseSchema(conversationSchema),
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
		const clientId = c.get("clientId" as never) as string;
		// sessionId is always defined when mounted at /widget/:clientId/sessions/:sessionId/conversations
		const sessionId = c.req.param("sessionId") as string;
		const conversation = await widgetService.startConversation(
			clientId,
			sessionId,
		);
		return c.json({ success: true as const, data: conversation }, 201);
	},
);

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
		const clientId = c.get("clientId" as never) as string;
		const { conversationId } = c.req.valid("param");
		await widgetService.resetConversation(clientId, conversationId);
		return c.json(
			{ success: true as const, data: { message: "Conversation reset" } },
			200,
		);
	},
);

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
						schema: z.object({ rating: z.number().int().min(1).max(5) }),
					},
				},
			},
		},
		responses: {
			200: {
				description: "Rating submitted",
				content: {
					"application/json": {
						schema: successResponseSchema(conversationSchema),
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
		const clientId = c.get("clientId" as never) as string;
		const { conversationId } = c.req.valid("param");
		const { rating } = c.req.valid("json");
		const updated = await widgetService.rateConversation(
			clientId,
			conversationId,
			rating,
		);
		return c.json({ success: true as const, data: updated }, 200);
	},
);

// ─── Message routes ────────────────────────────────────────────────────────────

export const widgetMessageRoutes = new OpenAPIHono();

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
						schema: successResponseSchema(z.array(messageSchema)),
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
		const clientId = c.get("clientId" as never) as string;
		// conversationId is always defined when mounted at /.../conversations/:conversationId/messages
		const conversationId = c.req.param("conversationId") as string;
		const msgs = await widgetService.getMessageHistory(
			clientId,
			conversationId,
		);
		return c.json({ success: true as const, data: msgs }, 200);
	},
);

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
						schema: z.object({ content: z.string().min(1) }),
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
								userMessage: messageSchema,
								assistantMessage: messageSchema,
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
		const clientId = c.get("clientId" as never) as string;
		const conversationId = c.req.param("conversationId") as string;
		const { content } = c.req.valid("json");
		const result = await widgetService.sendMessage(
			clientId,
			conversationId,
			content,
		);
		return c.json({ success: true as const, data: result }, 200);
	},
);
