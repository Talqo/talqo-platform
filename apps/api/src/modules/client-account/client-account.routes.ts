import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
	errorResponseSchema,
	successResponseSchema,
} from "../../common/schemas";
import { clientAccountService } from "./index";

const router = new OpenAPIHono();

const clientProfileSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	email: z.string().email(),
	balanceUsd: z.string(),
	monthlyUsageLimit: z.string().nullable(),
	usageAlertThresholdUsd: z.string().nullable(),
	status: z.string(),
	lastActive: z.string().nullable(),
	createdAt: z.string(),
});

router.openapi(
	createRoute({
		method: "get",
		path: "/me",
		tags: ["Client Account"],
		summary: "Get client profile",
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				description: "Client profile",
				content: {
					"application/json": {
						schema: successResponseSchema(clientProfileSchema),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string;
		const profile = await clientAccountService.getProfile(clientId);
		return c.json({ success: true as const, data: profile }, 200);
	},
);

router.openapi(
	createRoute({
		method: "patch",
		path: "/me",
		tags: ["Client Account"],
		summary: "Update client profile",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							name: z.string().min(1).max(255).optional(),
							email: z.string().email().optional(),
						}),
					},
				},
			},
		},
		responses: {
			200: {
				description: "Updated profile",
				content: {
					"application/json": {
						schema: successResponseSchema(
							z.object({ id: z.string(), name: z.string(), email: z.string() }),
						),
					},
				},
			},
			409: {
				description: "Email already in use",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string;
		const body = c.req.valid("json");
		const result = await clientAccountService.updateProfile(clientId, body);
		return c.json({ success: true as const, data: result }, 200);
	},
);

router.openapi(
	createRoute({
		method: "patch",
		path: "/me/password",
		tags: ["Client Account"],
		summary: "Change password",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							currentPassword: z.string().min(1),
							newPassword: z.string().min(8),
						}),
					},
				},
			},
		},
		responses: {
			200: {
				description: "Password changed",
				content: {
					"application/json": {
						schema: successResponseSchema(z.object({ message: z.string() })),
					},
				},
			},
			401: {
				description: "Current password incorrect",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string;
		const body = c.req.valid("json");
		await clientAccountService.changePassword(clientId, body);
		return c.json(
			{ success: true as const, data: { message: "Password changed" } },
			200,
		);
	},
);

router.openapi(
	createRoute({
		method: "post",
		path: "/me/balance",
		tags: ["Client Account"],
		summary: "Add funds to account",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({ amount: z.number().positive() }),
					},
				},
			},
		},
		responses: {
			200: {
				description: "Balance updated",
				content: {
					"application/json": {
						schema: successResponseSchema(z.object({ balanceUsd: z.string() })),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string;
		const { amount } = c.req.valid("json");
		const result = await clientAccountService.addFunds(clientId, amount);
		return c.json({ success: true as const, data: result }, 200);
	},
);

router.openapi(
	createRoute({
		method: "patch",
		path: "/me/usage-limit",
		tags: ["Client Account"],
		summary: "Set monthly usage limit",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({ limit: z.number().nonnegative().nullable() }),
					},
				},
			},
		},
		responses: {
			200: {
				description: "Limit updated",
				content: {
					"application/json": {
						schema: successResponseSchema(z.object({ message: z.string() })),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string;
		const { limit } = c.req.valid("json");
		await clientAccountService.setUsageLimit(clientId, limit);
		return c.json(
			{ success: true as const, data: { message: "Usage limit updated" } },
			200,
		);
	},
);

router.openapi(
	createRoute({
		method: "patch",
		path: "/me/usage-alert",
		tags: ["Client Account"],
		summary: "Set usage alert threshold",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							thresholdUsd: z.number().nonnegative().nullable(),
						}),
					},
				},
			},
		},
		responses: {
			200: {
				description: "Alert threshold updated",
				content: {
					"application/json": {
						schema: successResponseSchema(z.object({ message: z.string() })),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string;
		const { thresholdUsd } = c.req.valid("json");
		await clientAccountService.setUsageAlert(clientId, thresholdUsd);
		return c.json(
			{ success: true as const, data: { message: "Usage alert updated" } },
			200,
		);
	},
);

export default router;
