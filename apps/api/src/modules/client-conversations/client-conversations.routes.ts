import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi"
import { messageResponseSchema } from "db/dto"
import { clientConversationSummarySchema, paginationQuerySchema } from "shared"
import type { AppVariables } from "@/common/jwt"
import { createRouter } from "@/common/router"
import { errorResponseSchema, successResponseSchema } from "@/common/schemas"
import type { ClientConversationService } from "./client-conversations.service"

export function createClientConversationRouter(
	service: ClientConversationService,
): OpenAPIHono<{ Variables: AppVariables }> {
	const router = createRouter<{ Variables: AppVariables }>()

	router.openapi(
		createRoute({
			method: "get",
			path: "/",
			tags: ["Client Account"],
			summary: "List own conversations",
			security: [{ bearerAuth: [] }],
			request: { query: paginationQuerySchema },
			responses: {
				200: {
					description: "Conversation list",
					content: {
						"application/json": {
							schema: successResponseSchema(
								z.array(clientConversationSummarySchema),
							),
						},
					},
				},
			},
		}),
		async (c) => {
			const clientId = c.get("clientId")
			const { limit, offset } = c.req.valid("query")
			const result = await service.listConversations(clientId, limit, offset)
			return c.json(result, 200)
		},
	)

	router.openapi(
		createRoute({
			method: "get",
			path: "/{conversationId}",
			tags: ["Client Account"],
			summary: "Get own conversation with messages",
			security: [{ bearerAuth: [] }],
			request: {
				params: z.object({ conversationId: z.string().uuid() }),
			},
			responses: {
				200: {
					description: "Conversation detail with messages",
					content: {
						"application/json": {
							schema: successResponseSchema(
								clientConversationSummarySchema
									.omit({ messageCount: true })
									.extend({ messages: z.array(messageResponseSchema) }),
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
			const clientId = c.get("clientId")
			const { conversationId } = c.req.valid("param")
			const result = await service.getConversation(conversationId, clientId)
			return c.json(result, 200)
		},
	)

	return router
}
