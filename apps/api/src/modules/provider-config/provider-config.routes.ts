import { createRoute, OpenAPIHono } from "@hono/zod-openapi"
import { upsertProviderConfigBodySchema } from "shared"
import { z } from "zod"
import { successResponseSchema } from "../../common/schemas"
import { providerConfigService } from "./index"

const router = new OpenAPIHono()

const providerConfigResponseSchema = z
	.object({
		id: z.string().uuid(),
		clientId: z.string().uuid(),
		providerType: z.enum([
			"openai",
			"openai_compatible",
			"google",
			"anthropic",
		]),
		apiKeyMasked: z.string(),
		model: z.string(),
		baseUrl: z.string().nullable(),
		updatedAt: z.string(),
	})
	.nullable()

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
						schema: successResponseSchema(providerConfigResponseSchema),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string
		const config = await providerConfigService.getConfig(clientId)
		return c.json({ success: true as const, data: config }, 200)
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
						schema: successResponseSchema(providerConfigResponseSchema),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string
		const body = c.req.valid("json")
		const config = await providerConfigService.upsertConfig(clientId, {
			providerType: body.providerType,
			apiKey: body.apiKey,
			model: body.model,
			baseUrl: "baseUrl" in body ? body.baseUrl : undefined,
		})
		return c.json({ success: true as const, data: config }, 200)
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
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string
		await providerConfigService.deleteConfig(clientId)
		return c.json(
			{ success: true as const, data: { deleted: true as const } },
			200,
		)
	},
)

export default router
