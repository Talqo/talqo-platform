import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi"
import { clientResponseSchema } from "db/dto"
import {
	addFundsBodySchema,
	changePasswordBodySchema,
	updateProfileBodySchema,
	usageAlertBodySchema,
	usageLimitBodySchema,
} from "shared"
import {
	errorResponseSchema,
	successResponseSchema,
} from "../../common/schemas"
import { clientAccountService } from "./index"

const router = new OpenAPIHono()

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
						schema: successResponseSchema(clientResponseSchema),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string
		const profile = await clientAccountService.getProfile(clientId)
		return c.json({  data: profile }, 200)
	},
)

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
						schema: updateProfileBodySchema,
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
		const clientId = c.get("clientId" as never) as string
		const body = c.req.valid("json")
		const result = await clientAccountService.updateProfile(clientId, body)
		return c.json({  data: result }, 200)
	},
)

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
						schema: changePasswordBodySchema,
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
		const clientId = c.get("clientId" as never) as string
		const body = c.req.valid("json")
		await clientAccountService.changePassword(clientId, body)
		return c.json(
			{  data: { message: "Password changed" } },
			200,
		)
	},
)

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
						schema: addFundsBodySchema,
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
		const clientId = c.get("clientId" as never) as string
		const { amount } = c.req.valid("json")
		const result = await clientAccountService.addFunds(clientId, amount)
		return c.json({  data: result }, 200)
	},
)

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
						schema: usageLimitBodySchema,
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
		const clientId = c.get("clientId" as never) as string
		const { limit } = c.req.valid("json")
		await clientAccountService.setUsageLimit(clientId, limit)
		return c.json(
			{  data: { message: "Usage limit updated" } },
			200,
		)
	},
)

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
						schema: usageAlertBodySchema,
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
		const clientId = c.get("clientId" as never) as string
		const { thresholdUsd } = c.req.valid("json")
		await clientAccountService.setUsageAlert(clientId, thresholdUsd)
		return c.json(
			{  data: { message: "Usage alert updated" } },
			200,
		)
	},
)

router.openapi(
	createRoute({
		method: "post",
		path: "/me/dismiss-widget-setup",
		tags: ["Client Account"],
		summary: "Dismiss widget setup onboarding",
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				description: "Widget setup dismissed",
				content: {
					"application/json": {
						schema: successResponseSchema(z.object({ message: z.string() })),
					},
				},
			},
			404: {
				description: "Client not found",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string
		await clientAccountService.dismissWidgetSetup(clientId)
		return c.json(
			{  data: { message: "Widget setup dismissed" } },
			200,
		)
	},
)

export default router
