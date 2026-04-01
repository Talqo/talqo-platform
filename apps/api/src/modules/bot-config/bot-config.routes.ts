import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { successResponseSchema } from "../../common/schemas";
import { botConfigService } from "./index";

const router = new OpenAPIHono();

const botConfigSchema = z.object({
	id: z.string().uuid(),
	clientId: z.string().uuid(),
	systemPrompt: z.string().nullable(),
	defaultRole: z.string().nullable(),
	toneStyle: z.string().nullable(),
	internetSearchEnabled: z.boolean(),
	updatedAt: z.string(),
});

const updateBotConfigSchema = z.object({
	systemPrompt: z.string().nullable().optional(),
	defaultRole: z.string().nullable().optional(),
	toneStyle: z.string().nullable().optional(),
	internetSearchEnabled: z.boolean().optional(),
});

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
						schema: successResponseSchema(botConfigSchema),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string;
		const config = await botConfigService.getConfig(clientId);
		return c.json({ success: true as const, data: config }, 200);
	},
);

router.openapi(
	createRoute({
		method: "patch",
		path: "/",
		tags: ["Bot Config"],
		summary: "Update bot configuration",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: { "application/json": { schema: updateBotConfigSchema } },
			},
		},
		responses: {
			200: {
				description: "Updated bot configuration",
				content: {
					"application/json": {
						schema: successResponseSchema(botConfigSchema),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string;
		const body = c.req.valid("json");
		const config = await botConfigService.updateConfig(clientId, body);
		return c.json({ success: true as const, data: config }, 200);
	},
);

export default router;
