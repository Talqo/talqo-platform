import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { LoginSchema } from "shared";
import {
	errorResponseSchema,
	paginationQuerySchema,
	successResponseSchema,
} from "../../common/schemas";
import type { AdminService } from "./admin.service";

// ─── Admin auth (unprotected) ──────────────────────────────────────────────────

export function createAdminAuthRouter(service: AdminService): OpenAPIHono {
	const router = new OpenAPIHono();

	router.openapi(
		createRoute({
			method: "post",
			path: "/login",
			tags: ["Admin"],
			summary: "Admin login",
			request: {
				body: {
					content: {
						"application/json": {
							schema: LoginSchema,
						},
					},
				},
			},
			responses: {
				200: {
					description: "Login successful",
					content: {
						"application/json": {
							schema: successResponseSchema(
								z.object({
									token: z.string(),
									admin: z.object({ id: z.string(), email: z.string() }),
								}),
							),
						},
					},
				},
				401: {
					description: "Invalid credentials",
					content: { "application/json": { schema: errorResponseSchema } },
				},
			},
		}),
		async (c) => {
			const body = c.req.valid("json");
			const result = await service.login(body);
			return c.json({ success: true as const, data: result }, 200);
		},
	);

	router.openapi(
		createRoute({
			method: "post",
			path: "/logout",
			tags: ["Admin"],
			summary: "Admin logout",
			responses: {
				200: {
					description: "Logged out",
					content: {
						"application/json": {
							schema: successResponseSchema(z.object({ message: z.string() })),
						},
					},
				},
			},
		}),
		async (c) => {
			return c.json(
				{ success: true as const, data: { message: "Logged out" } },
				200,
			);
		},
	);

	return router;
}

// ─── Admin client management (protected) ──────────────────────────────────────

const clientSummarySchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	email: z.string().email(),
	balanceUsd: z.string(),
	status: z.string(),
	lastActive: z.string().nullable(),
	createdAt: z.string(),
});

export function createAdminClientRouter(service: AdminService): OpenAPIHono {
	const router = new OpenAPIHono();

	router.openapi(
		createRoute({
			method: "get",
			path: "/",
			tags: ["Admin"],
			summary: "List all clients",
			security: [{ bearerAuth: [] }],
			request: { query: paginationQuerySchema },
			responses: {
				200: {
					description: "Clients list",
					content: {
						"application/json": {
							schema: successResponseSchema(z.array(clientSummarySchema)),
						},
					},
				},
			},
		}),
		async (c) => {
			const { limit, offset } = c.req.valid("query");
			const clients = await service.listClients(limit, offset);
			return c.json({ success: true as const, data: clients }, 200);
		},
	);

	router.openapi(
		createRoute({
			method: "get",
			path: "/:clientId",
			tags: ["Admin"],
			summary: "Get client details",
			security: [{ bearerAuth: [] }],
			request: {
				params: z.object({ clientId: z.string().uuid() }),
			},
			responses: {
				200: {
					description: "Client detail",
					content: {
						"application/json": {
							schema: successResponseSchema(
								clientSummarySchema.extend({
									totalTokens: z.number(),
									totalCostUsd: z.string().nullable(),
									totalConversations: z.number(),
								}),
							),
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
			const { clientId } = c.req.valid("param");
			const client = await service.getClient(clientId);
			return c.json({ success: true as const, data: client }, 200);
		},
	);

	router.openapi(
		createRoute({
			method: "patch",
			path: "/:clientId/status",
			tags: ["Admin"],
			summary: "Suspend or re-enable a client",
			security: [{ bearerAuth: [] }],
			request: {
				params: z.object({ clientId: z.string().uuid() }),
				body: {
					content: {
						"application/json": {
							schema: z.object({
								status: z.enum(["active", "suspended"]),
							}),
						},
					},
				},
			},
			responses: {
				200: {
					description: "Status updated",
					content: {
						"application/json": {
							schema: successResponseSchema(
								z.object({ id: z.string(), status: z.string() }),
							),
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
			const { clientId } = c.req.valid("param");
			const { status } = c.req.valid("json");
			const updated = await service.updateClientStatus(clientId, status);
			return c.json({ success: true as const, data: updated }, 200);
		},
	);

	router.openapi(
		createRoute({
			method: "post",
			path: "/:clientId/impersonate",
			tags: ["Admin"],
			summary: "Issue an impersonation token for a client",
			security: [{ bearerAuth: [] }],
			request: {
				params: z.object({ clientId: z.string().uuid() }),
			},
			responses: {
				200: {
					description: "Impersonation token issued",
					content: {
						"application/json": {
							schema: successResponseSchema(z.object({ token: z.string() })),
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
			const { clientId } = c.req.valid("param");
			const result = await service.impersonate(clientId);
			return c.json({ success: true as const, data: result }, 200);
		},
	);

	return router;
}
