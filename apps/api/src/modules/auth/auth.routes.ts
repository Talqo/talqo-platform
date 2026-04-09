import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi"
import { LoginSchema, RegisterSchema, VerifyEmailSchema } from "shared"
import type { AppVariables } from "../../common/jwt"
import {
	errorResponseSchema,
	successResponseSchema,
} from "../../common/schemas"
import type { AuthService } from "./auth.service"

export function createAuthRouter(
	service: AuthService,
): OpenAPIHono<{ Variables: AppVariables }> {
	const router = new OpenAPIHono<{ Variables: AppVariables }>()

	router.openapi(
		createRoute({
			method: "post",
			path: "/register",
			tags: ["Auth"],
			summary: "Register a new client account",
			request: {
				body: {
					content: {
						"application/json": {
							schema: RegisterSchema,
						},
					},
				},
			},
			responses: {
				201: {
					description: "Verification email sent",
					content: {
						"application/json": {
							schema: successResponseSchema(z.object({ message: z.string() })),
						},
					},
				},
			},
		}),
		async (c) => {
			const { name, email, password } = c.req.valid("json")
			try {
				await service.register(name, email, password)
			} catch (err) {
				if (err instanceof Error && err.message === "EMAIL_TAKEN") {
					// Return same response as success to prevent account enumeration
					c.get("logger").warn("Registration attempted with taken email")
				} else if (err instanceof Error) {
					// Log email errors but still return success (don't expose email issues)
					c.get("logger").error("Registration error (email send failed)", {
						error: err.message,
						email,
					})
					throw err
				} else {
					throw err
				}
			}
			return c.json(
				{
					success: true as const,
					data: { message: "Verification email sent" },
				},
				201,
			)
		},
	)

	router.openapi(
		createRoute({
			method: "get",
			path: "/verify-email",
			tags: ["Auth"],
			summary: "Verify email address with token",
			request: {
				query: VerifyEmailSchema,
			},
			responses: {
				200: {
					description: "Email verified successfully",
					content: {
						"application/json": {
							schema: successResponseSchema(z.object({ message: z.string() })),
						},
					},
				},
				400: {
					description: "Invalid or expired token",
					content: { "application/json": { schema: errorResponseSchema } },
				},
				409: {
					description: "Email already verified",
					content: { "application/json": { schema: errorResponseSchema } },
				},
			},
		}),
		async (c) => {
			const { token } = c.req.valid("query")
			try {
				await service.verifyEmail(token)
				return c.json(
					{
						success: true as const,
						data: { message: "Email verified successfully" },
					},
					200,
				)
			} catch (err) {
				if (err instanceof Error) {
					if (
						err.message === "INVALID_TOKEN" ||
						err.message === "TOKEN_EXPIRED"
					) {
						c.get("logger").warn("Email verification failed", {
							reason: err.message,
						})
						return c.json(
							{
								success: false as const,
								error: {
									code: err.message,
									message: "Invalid or expired token",
								},
							},
							400,
						)
					}
					if (err.message === "EMAIL_ALREADY_VERIFIED") {
						c.get("logger").warn("Email verification failed", {
							reason: err.message,
						})
						return c.json(
							{
								success: false as const,
								error: {
									code: "EMAIL_ALREADY_VERIFIED",
									message: "Email already verified",
								},
							},
							409,
						)
					}
				}
				throw err
			}
		},
	)

	router.openapi(
		createRoute({
			method: "post",
			path: "/login",
			tags: ["Auth"],
			summary: "Log in to a client account",
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
							schema: successResponseSchema(z.object({ token: z.string() })),
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
			const { email, password } = c.req.valid("json")
			try {
				const token = await service.login(email, password)
				return c.json({ success: true as const, data: { token } }, 200)
			} catch (err) {
				if (err instanceof Error && err.message === "INVALID_CREDENTIALS") {
					c.get("logger").warn("Login failed", { reason: err.message })
					return c.json(
						{
							success: false as const,
							error: {
								code: "INVALID_CREDENTIALS",
								message: "Invalid credentials",
							},
						},
						401,
					)
				}
				throw err
			}
		},
	)

	return router
}
