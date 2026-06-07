import { createRoute } from "@hono/zod-openapi"
import { botConfigResponseSchema } from "db/dto"
import { updateBotConfigBodySchema } from "shared"
import type { AppVariables } from "@/common/jwt"
import { createRouter } from "@/common/router"
import { successResponseSchema } from "@/common/schemas"
import { botConfigService } from "./index"

const router = createRouter<{ Variables: AppVariables }>()

router.openapi(
	createRoute({
		method: "get",
		path: "/",
		tags: ["Bot Config"],
		summary: "Get bot configuration",
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				description: "Bot configuration",
				content: {
					"application/json": {
						schema: successResponseSchema(botConfigResponseSchema),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		const config = await botConfigService.getConfig(clientId)
		return c.json(config, 200)
	},
)

router.openapi(
	createRoute({
		method: "patch",
		path: "/",
		tags: ["Bot Config"],
		summary: "Update bot configuration",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: { "application/json": { schema: updateBotConfigBodySchema } },
			},
		},
		responses: {
			200: {
				description: "Updated bot configuration",
				content: {
					"application/json": {
						schema: successResponseSchema(botConfigResponseSchema),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		const body = c.req.valid("json")
		const config = await botConfigService.updateConfig(clientId, body)
		return c.json(config, 200)
	},
)

export default router
