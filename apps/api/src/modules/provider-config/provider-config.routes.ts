import { createRoute, z } from "@hono/zod-openapi"
import { aiProviderConfigMaskedResponseSchema } from "db/dto"
import { upsertProviderConfigBodySchema } from "shared"
import type { AppVariables } from "@/common/jwt"
import { createRouter } from "@/common/router"
import { errorResponseSchema, successResponseSchema } from "@/common/schemas"
import { providerConfigService } from "./index"

const router = createRouter<{ Variables: AppVariables }>()

router.openapi(
	createRoute({
		method: "get",
		path: "/",
		tags: ["Provider Config"],
		summary: "Get current AI provider configuration",
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				description: "Provider config or null (platform default)",
				content: {
					"application/json": {
						schema: successResponseSchema(
							aiProviderConfigMaskedResponseSchema.nullable(),
						),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		const config = await providerConfigService.getConfig(clientId)
		return c.json(config, 200)
	},
)

router.openapi(
	createRoute({
		method: "put",
		path: "/",
		tags: ["Provider Config"],
		summary: "Create or replace AI provider configuration",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					"application/json": { schema: upsertProviderConfigBodySchema },
				},
			},
		},
		responses: {
			200: {
				description: "Upserted provider config",
				content: {
					"application/json": {
						schema: successResponseSchema(
							aiProviderConfigMaskedResponseSchema.nullable(),
						),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		const body = c.req.valid("json")
		const config = await providerConfigService.upsertConfig(clientId, {
			providerType: body.providerType,
			apiKey: body.apiKey,
			model: body.model,
			baseUrl: "baseUrl" in body ? body.baseUrl : undefined,
		})
		return c.json(config, 200)
	},
)

router.openapi(
	createRoute({
		method: "delete",
		path: "/",
		tags: ["Provider Config"],
		summary: "Remove AI provider configuration (reverts to platform default)",
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				description: "Deleted successfully",
				content: {
					"application/json": {
						schema: successResponseSchema(
							z.object({ deleted: z.literal(true) }),
						),
					},
				},
			},
			404: {
				description: "No provider config found",
				content: {
					"application/json": { schema: errorResponseSchema },
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		await providerConfigService.deleteConfig(clientId)
		return c.json({ deleted: true as const }, 200)
	},
)

export default router
