import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi"
import { analyticsQuerySchema } from "shared"
import { successResponseSchema } from "../../common/schemas"
import { analyticsService } from "./index"

// ─── Client analytics ──────────────────────────────────────────────────────────

export const clientAnalyticsRoutes = new OpenAPIHono()

clientAnalyticsRoutes.openapi(
	createRoute({
		method: "get",
		path: "/tokens",
		tags: ["Analytics"],
		summary: "Token consumption over time",
		security: [{ bearerAuth: [] }],
		request: { query: analyticsQuerySchema },
		responses: {
			200: {
				description: "Token usage data",
				content: {
					"application/json": {
						schema: successResponseSchema(
							z.array(
								z.object({
									period: z.string(),
									tokensUsed: z.number(),
									costUsd: z.string().nullable(),
								}),
							),
						),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string
		const query = c.req.valid("query")
		const data = await analyticsService.getTokenAnalytics(clientId, query)
		return c.json({ data }, 200)
	},
)

clientAnalyticsRoutes.openapi(
	createRoute({
		method: "get",
		path: "/messages",
		tags: ["Analytics"],
		summary: "Message count over time",
		security: [{ bearerAuth: [] }],
		request: { query: analyticsQuerySchema },
		responses: {
			200: {
				description: "Message count data",
				content: {
					"application/json": {
						schema: successResponseSchema(
							z.array(
								z.object({
									period: z.string(),
									messageCount: z.number(),
								}),
							),
						),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string
		const query = c.req.valid("query")
		const data = await analyticsService.getMessageAnalytics(clientId, query)
		return c.json({ data }, 200)
	},
)

// ─── Admin analytics ───────────────────────────────────────────────────────────

export const adminAnalyticsRoutes = new OpenAPIHono()

adminAnalyticsRoutes.openapi(
	createRoute({
		method: "get",
		path: "/",
		tags: ["Admin"],
		summary: "Platform-wide usage statistics",
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				description: "Platform stats",
				content: {
					"application/json": {
						schema: successResponseSchema(
							z.object({
								totalTokens: z.number(),
								totalCostUsd: z.string().nullable(),
								activeClients: z.number(),
								totalConversations: z.number(),
							}),
						),
					},
				},
			},
		},
	}),
	async (c) => {
		const data = await analyticsService.getPlatformStats()
		return c.json({ data }, 200)
	},
)
