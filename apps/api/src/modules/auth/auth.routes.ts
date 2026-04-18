import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi"
import {
	ForgotPasswordSchema,
	LoginSchema,
	RegisterSchema,
	ResetPasswordSchema,
	VerifyEmailSchema,
	VerifyResetTokenSchema,
} from "shared"
import { AppError } from "../../common/errors"
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
				409: {
					description: "Email or name already taken",
					content: { "application/json": { schema: errorResponseSchema } },
				},
				500: {
					description: "Failed to send verification email",
					content: { "application/json": { schema: errorResponseSchema } },
				},
			},
		}),
		async (c) => {
			const { name, email, password } = c.req.valid("json")
			try {
				await service.register(name, email, password)
			} catch (err) {
				// Let AppError propagate to errorHandler
				if (err instanceof AppError) throw err
				// Email sending failures should return 500
				if (err instanceof Error && err.message.includes("email")) {
					c.get("logger").error("Registration error", {
						error: err.message,
						email,
					})
					return c.json(
						{
							success: false as const,
							error: {
								code: "EMAIL_FAILED",
								message: "Failed to send verification email",
							},
						},
						500,
					)
				}
				throw err
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
					description: "Email verified successfully, returns JWT token",
					content: {
						"application/json": {
							schema: successResponseSchema(
								z.object({ token: z.string(), message: z.string() }),
							),
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
			const jwtToken = await service.verifyEmail(token)
			return c.json(
				{
					success: true as const,
					data: {
						token: jwtToken,
						message: "Email verified successfully",
					},
				},
				200,
			)
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
			const token = await service.login(email, password)
			return c.json({ success: true as const, data: { token } }, 200)
		},
	)

	router.openapi(
		createRoute({
			method: "post",
			path: "/resend-verification",
			tags: ["Auth"],
			summary: "Resend verification email",
			request: {
				body: {
					content: {
						"application/json": {
							schema: z.object({ email: z.string().email() }),
						},
					},
				},
			},
			responses: {
				200: {
					description:
						"If a pending registration exists, verification email sent",
					content: {
						"application/json": {
							schema: successResponseSchema(z.object({ message: z.string() })),
						},
					},
				},
				400: {
					description: "Invalid email format",
					content: { "application/json": { schema: errorResponseSchema } },
				},
			},
		}),
		async (c) => {
			const { email } = c.req.valid("json")
			try {
				await service.resendVerificationEmail(email)
			} catch (err) {
				// Log error but still return success to prevent user enumeration
				c.get("logger").error("Failed to resend verification email", {
					email,
					error: err instanceof Error ? err.message : String(err),
				})
			}
			// Always return success to prevent user enumeration
			return c.json(
				{
					success: true as const,
					data: {
						message:
							"If a registration exists, a verification email has been sent",
					},
				},
				200,
			)
		},
	)

	router.openapi(
		createRoute({
			method: "post",
			path: "/forgot-password",
			tags: ["Auth"],
			summary: "Request password reset email",
			request: {
				body: {
					content: {
						"application/json": {
							schema: ForgotPasswordSchema,
						},
					},
				},
			},
			responses: {
				200: {
					description: "If account exists, password reset email sent",
					content: {
						"application/json": {
							schema: successResponseSchema(z.object({ message: z.string() })),
						},
					},
				},
				400: {
					description: "Invalid email format",
					content: { "application/json": { schema: errorResponseSchema } },
				},
			},
		}),
		async (c) => {
			const { email } = c.req.valid("json")
			try {
				await service.requestPasswordReset(email)
			} catch (err) {
				c.get("logger").error("Failed to send password reset email", {
					email,
					error: err instanceof Error ? err.message : String(err),
				})
			}
			// Always return success to prevent user enumeration
			return c.json(
				{
					success: true as const,
					data: {
						message:
							"If an account exists with this email, a password reset link has been sent",
					},
				},
				200,
			)
		},
	)

	router.openapi(
		createRoute({
			method: "get",
			path: "/verify-reset-token",
			tags: ["Auth"],
			summary: "Verify password reset token is valid and not expired",
			request: {
				query: VerifyResetTokenSchema,
			},
			responses: {
				200: {
					description: "Token is valid",
					content: {
						"application/json": {
							schema: successResponseSchema(
								z.object({ valid: z.boolean(), email: z.string().optional() }),
							),
						},
					},
				},
				400: {
					description: "Invalid or expired token",
					content: { "application/json": { schema: errorResponseSchema } },
				},
			},
		}),
		async (c) => {
			const { token } = c.req.valid("query")
			const isValid = await service.verifyResetToken(token)
			if (!isValid) {
				return c.json(
					{
						success: false as const,
						error: {
							code: "INVALID_TOKEN",
							message: "Invalid or expired token",
						},
					},
					400,
				)
			}
			return c.json(
				{
					success: true as const,
					data: { valid: true },
				},
				200,
			)
		},
	)

	router.openapi(
		createRoute({
			method: "post",
			path: "/reset-password",
			tags: ["Auth"],
			summary: "Reset password with token",
			request: {
				body: {
					content: {
						"application/json": {
							schema: ResetPasswordSchema,
						},
					},
				},
			},
			responses: {
				200: {
					description: "Password reset successful",
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
			},
		}),
		async (c) => {
			const { token, password } = c.req.valid("json")
			await service.resetPassword(token, password)
			return c.json(
				{
					success: true as const,
					data: { message: "Password reset successful" },
				},
				200,
			)
		},
	)

	return router
}
