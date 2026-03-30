import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
	errorResponseSchema,
	successResponseSchema,
} from "../../common/schemas";
import { authService } from "./index";

const router = new OpenAPIHono();

const registerBodySchema = z.object({
	name: z.string().min(1).max(255),
	email: z.string().email(),
	password: z.string().min(8),
});

const loginBodySchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

const clientSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	email: z.string().email(),
});

const authResponseSchema = successResponseSchema(
	z.object({
		token: z.string(),
		client: clientSchema,
	}),
);

router.openapi(
	createRoute({
		method: "post",
		path: "/register",
		tags: ["Auth"],
		summary: "Register a new client account",
		request: {
			body: { content: { "application/json": { schema: registerBodySchema } } },
		},
		responses: {
			201: {
				description: "Client created",
				content: { "application/json": { schema: authResponseSchema } },
			},
			409: {
				description: "Email already registered",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const body = c.req.valid("json");
		const result = await authService.register(body);
		return c.json({ success: true as const, data: result }, 201);
	},
);

router.openapi(
	createRoute({
		method: "post",
		path: "/login",
		tags: ["Auth"],
		summary: "Client login",
		request: {
			body: { content: { "application/json": { schema: loginBodySchema } } },
		},
		responses: {
			200: {
				description: "Login successful",
				content: { "application/json": { schema: authResponseSchema } },
			},
			401: {
				description: "Invalid credentials",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const body = c.req.valid("json");
		const result = await authService.login(body);
		return c.json({ success: true as const, data: result }, 200);
	},
);

router.openapi(
	createRoute({
		method: "post",
		path: "/logout",
		tags: ["Auth"],
		summary: "Client logout",
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

export default router;
