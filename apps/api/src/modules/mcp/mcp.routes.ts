import { createRoute, z } from "@hono/zod-openapi"
import { customServerResponseSchema, preMadeServerResponseSchema } from "db/dto"
import type { McpServerConfig } from "shared"
import {
	adminMcpConfigBodySchema,
	adminMcpVerifyBodySchema,
	clientMcpVerifyByIdBodySchema,
	mcpConfigBodySchema,
	paginationQuerySchema,
} from "shared"
import { NotFoundError } from "@/common/errors"
import type { AppVariables } from "@/common/jwt"
import { createRouter } from "@/common/router"
import { errorResponseSchema, successResponseSchema } from "@/common/schemas"
import { verifyMcpServer } from "@/modules/agent/agent.mcp"
import { mcpService } from "./index"

const serverIdParam = z.object({ serverId: z.string().uuid() })

const mcpVerifyResponseSchema = z.discriminatedUnion("ok", [
	z.object({ ok: z.literal(true), tools: z.array(z.string()) }),
	z.object({ ok: z.literal(false), error: z.string() }),
])

// ─── Client MCP routes ─────────────────────────────────────────────────────────

export const clientMcpRoutes = createRouter<{ Variables: AppVariables }>()

clientMcpRoutes.openapi(
	createRoute({
		method: "get",
		path: "/pre-made",
		tags: ["MCP"],
		summary: "List all available pre-made MCP servers",
		security: [{ bearerAuth: [] }],
		request: { query: paginationQuerySchema },
		responses: {
			200: {
				description: "Pre-made servers",
				content: {
					"application/json": {
						schema: successResponseSchema(z.array(preMadeServerResponseSchema)),
					},
				},
			},
		},
	}),
	async (c) => {
		const { limit, offset } = c.req.valid("query")
		const servers = await mcpService.listPreMadeServers({ limit, offset })
		return c.json(servers, 200)
	},
)

clientMcpRoutes.openapi(
	createRoute({
		method: "get",
		path: "/pre-made/enabled",
		tags: ["MCP"],
		summary: "List enabled pre-made MCP servers for this client",
		security: [{ bearerAuth: [] }],
		request: { query: paginationQuerySchema },
		responses: {
			200: {
				description: "Enabled pre-made servers",
				content: {
					"application/json": {
						schema: successResponseSchema(z.array(preMadeServerResponseSchema)),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		const { limit, offset } = c.req.valid("query")
		const servers = await mcpService.listEnabledPreMade(clientId, {
			limit,
			offset,
		})
		return c.json(servers, 200)
	},
)

clientMcpRoutes.openapi(
	createRoute({
		method: "post",
		path: "/pre-made/{serverId}",
		tags: ["MCP"],
		summary: "Enable a pre-made MCP server",
		security: [{ bearerAuth: [] }],
		request: { params: serverIdParam },
		responses: {
			200: {
				description: "Server enabled",
				content: {
					"application/json": {
						schema: successResponseSchema(z.object({ message: z.string() })),
					},
				},
			},
			404: {
				description: "Server not found",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		const { serverId } = c.req.valid("param")
		await mcpService.enablePreMade(clientId, serverId)
		return c.json({ message: "Server enabled" }, 200)
	},
)

clientMcpRoutes.openapi(
	createRoute({
		method: "delete",
		path: "/pre-made/{serverId}",
		tags: ["MCP"],
		summary: "Disable a pre-made MCP server",
		security: [{ bearerAuth: [] }],
		request: { params: serverIdParam },
		responses: {
			200: {
				description: "Server disabled",
				content: {
					"application/json": {
						schema: successResponseSchema(z.object({ message: z.string() })),
					},
				},
			},
			404: {
				description: "Server not enabled",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		const { serverId } = c.req.valid("param")
		await mcpService.disablePreMade(clientId, serverId)
		return c.json({ message: "Server disabled" }, 200)
	},
)

clientMcpRoutes.openapi(
	createRoute({
		method: "get",
		path: "/custom",
		tags: ["MCP"],
		summary: "List custom MCP servers",
		security: [{ bearerAuth: [] }],
		request: { query: paginationQuerySchema },
		responses: {
			200: {
				description: "Custom servers",
				content: {
					"application/json": {
						schema: successResponseSchema(z.array(customServerResponseSchema)),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		const { limit, offset } = c.req.valid("query")
		const servers = await mcpService.listCustomServers(clientId, {
			limit,
			offset,
		})
		return c.json(servers, 200)
	},
)

clientMcpRoutes.openapi(
	createRoute({
		method: "post",
		path: "/custom",
		tags: ["MCP"],
		summary: "Create a custom MCP server",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: mcpConfigBodySchema,
					},
				},
			},
		},
		responses: {
			201: {
				description: "Custom server created",
				content: {
					"application/json": {
						schema: successResponseSchema(customServerResponseSchema),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		const { mcpConfig } = c.req.valid("json")
		const server = await mcpService.createCustomServer(clientId, mcpConfig)
		return c.json(server, 201)
	},
)

clientMcpRoutes.openapi(
	createRoute({
		method: "patch",
		path: "/custom/{serverId}",
		tags: ["MCP"],
		summary: "Update a custom MCP server",
		security: [{ bearerAuth: [] }],
		request: {
			params: serverIdParam,
			body: {
				content: {
					"application/json": {
						schema: mcpConfigBodySchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Custom server updated",
				content: {
					"application/json": {
						schema: successResponseSchema(customServerResponseSchema),
					},
				},
			},
			404: {
				description: "Server not found",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		const { serverId } = c.req.valid("param")
		const { mcpConfig } = c.req.valid("json")
		const server = await mcpService.updateCustomServer(
			clientId,
			serverId,
			mcpConfig,
		)
		return c.json(server, 200)
	},
)

clientMcpRoutes.openapi(
	createRoute({
		method: "delete",
		path: "/custom/{serverId}",
		tags: ["MCP"],
		summary: "Delete a custom MCP server",
		security: [{ bearerAuth: [] }],
		request: { params: serverIdParam },
		responses: {
			200: {
				description: "Custom server deleted",
				content: {
					"application/json": {
						schema: successResponseSchema(z.object({ message: z.string() })),
					},
				},
			},
			404: {
				description: "Server not found",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		const { serverId } = c.req.valid("param")
		await mcpService.deleteCustomServer(clientId, serverId)
		return c.json({ message: "Server deleted" }, 200)
	},
)

clientMcpRoutes.openapi(
	createRoute({
		method: "post",
		path: "/verify",
		tags: ["MCP"],
		summary: "Verify an MCP server by stored configuration",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: clientMcpVerifyByIdBodySchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Verification result",
				content: {
					"application/json": {
						schema: mcpVerifyResponseSchema,
					},
				},
			},
			404: {
				description: "Server not found or not enabled",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string
		const { serverId } = c.req.valid("json")

		let config: McpServerConfig | null = null
		try {
			config = await mcpService.getCustomServerConfig(clientId, serverId)
		} catch (err) {
			if (!(err instanceof NotFoundError)) throw err
		}
		if (!config) {
			try {
				config = await mcpService.getEnabledPreMadeConfig(clientId, serverId)
			} catch (err) {
				if (!(err instanceof NotFoundError)) throw err
			}
		}

		if (!config) {
			throw new NotFoundError("Server not found or not enabled")
		}

		const result = await verifyMcpServer(config)
		return c.json(result, 200)
	},
)

// ─── Admin MCP routes ──────────────────────────────────────────────────────────

export const adminMcpRoutes = createRouter<{ Variables: AppVariables }>()

adminMcpRoutes.openapi(
	createRoute({
		method: "get",
		path: "/",
		tags: ["Admin"],
		summary: "List all pre-made MCP servers",
		security: [{ bearerAuth: [] }],
		request: { query: paginationQuerySchema },
		responses: {
			200: {
				description: "Pre-made servers",
				content: {
					"application/json": {
						schema: successResponseSchema(z.array(preMadeServerResponseSchema)),
					},
				},
			},
		},
	}),
	async (c) => {
		const { limit, offset } = c.req.valid("query")
		const servers = await mcpService.listPreMadeServers({ limit, offset })
		return c.json(servers, 200)
	},
)

adminMcpRoutes.openapi(
	createRoute({
		method: "post",
		path: "/",
		tags: ["Admin"],
		summary: "Create a pre-made MCP server",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: adminMcpConfigBodySchema,
					},
				},
			},
		},
		responses: {
			201: {
				description: "Server created",
				content: {
					"application/json": {
						schema: successResponseSchema(preMadeServerResponseSchema),
					},
				},
			},
		},
	}),
	async (c) => {
		const { name, description, mcpConfig } = c.req.valid("json")
		const server = await mcpService.createPreMadeServer(
			name,
			description,
			mcpConfig,
		)
		return c.json(server, 201)
	},
)

adminMcpRoutes.openapi(
	createRoute({
		method: "patch",
		path: "/{serverId}",
		tags: ["Admin"],
		summary: "Update a pre-made MCP server",
		security: [{ bearerAuth: [] }],
		request: {
			params: serverIdParam,
			body: {
				content: {
					"application/json": {
						schema: adminMcpConfigBodySchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Server updated",
				content: {
					"application/json": {
						schema: successResponseSchema(preMadeServerResponseSchema),
					},
				},
			},
			404: {
				description: "Server not found",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const { serverId } = c.req.valid("param")
		const { name, description, mcpConfig } = c.req.valid("json")
		const server = await mcpService.updatePreMadeServer(
			serverId,
			name,
			description,
			mcpConfig,
		)
		return c.json(server, 200)
	},
)

adminMcpRoutes.openapi(
	createRoute({
		method: "delete",
		path: "/{serverId}",
		tags: ["Admin"],
		summary: "Delete a pre-made MCP server",
		security: [{ bearerAuth: [] }],
		request: { params: serverIdParam },
		responses: {
			200: {
				description: "Server deleted",
				content: {
					"application/json": {
						schema: successResponseSchema(z.object({ message: z.string() })),
					},
				},
			},
			404: {
				description: "Server not found",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const { serverId } = c.req.valid("param")
		await mcpService.deletePreMadeServer(serverId)
		return c.json({ message: "Server deleted" }, 200)
	},
)

adminMcpRoutes.openapi(
	createRoute({
		method: "post",
		path: "/verify",
		tags: ["Admin"],
		summary: "Verify an MCP server configuration",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: adminMcpVerifyBodySchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Verification result",
				content: {
					"application/json": {
						schema: mcpVerifyResponseSchema,
					},
				},
			},
		},
	}),
	async (c) => {
		const { mcpConfig } = c.req.valid("json")
		const result = await verifyMcpServer(mcpConfig)
		return c.json(result, 200)
	},
)
