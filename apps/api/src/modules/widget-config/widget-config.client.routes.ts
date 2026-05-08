import { createRoute } from "@hono/zod-openapi"
import { widgetVisualConfigSchema } from "shared"
import { createRouter } from "../../common/router"
import { successResponseSchema } from "../../common/schemas"
import { widgetConfigService } from "./index"

const router = createRouter()

router.openapi(
	createRoute({
		method: "get",
		path: "/",
		tags: ["Widget Config"],
		summary: "Get widget visual configuration",
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				description: "Widget visual configuration",
				content: {
					"application/json": {
						schema: successResponseSchema(widgetVisualConfigSchema),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string
		const config = await widgetConfigService.getConfig(clientId)
		return c.json(config, 200)
	},
)

router.openapi(
	createRoute({
		method: "put",
		path: "/",
		tags: ["Widget Config"],
		summary: "Save widget visual configuration",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					"application/json": { schema: widgetVisualConfigSchema },
				},
			},
		},
		responses: {
			200: {
				description: "Saved widget visual configuration",
				content: {
					"application/json": {
						schema: successResponseSchema(widgetVisualConfigSchema),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string
		const body = c.req.valid("json")
		const saved = await widgetConfigService.saveConfig(clientId, body)
		return c.json(saved, 200)
	},
)

export { router as widgetConfigClientRoutes }
