import { createRoute, z } from "@hono/zod-openapi"
import {
	ForgotPasswordSchema,
	LoginSchema,
	RegisterSchema,
	ResendVerificationSchema,
	ResetPasswordSchema,
	VerifyEmailSchema,
	VerifyResetTokenSchema,
} from "shared"
import {
	BadRequestError,
	ForbiddenError,
	UnauthorizedError,
} from "@/common/errors"
import type { AppVariables } from "@/common/jwt"
import { authRateLimit } from "@/common/middleware/auth-rate-limit"
import { createRouter } from "@/common/router"
import { errorResponseSchema, successResponseSchema } from "@/common/schemas"
import { authService } from "./index"

export const authRoutes = createRouter<{ Variables: AppVariables }>()

authRoutes.use("/login", authRateLimit)
authRoutes.use("/forgot-password", authRateLimit)
authRoutes.use("/resend-verification", authRateLimit)

authRoutes.openapi(
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
		await authService.register(name, email, password)
		const wideEvent = c.get("wideEvent")
		if (wideEvent) wideEvent.auth = { outcome: "registered" }
		return c.json({ message: "Verification email sent" }, 201)
	},
)

authRoutes.openapi(
	createRoute({
		method: "post",
		path: "/verify-email",
		tags: ["Auth"],
		summary: "Verify email address with token",
		request: {
			body: {
				content: {
					"application/json": {
						schema: VerifyEmailSchema,
					},
				},
			},
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
		const { token } = c.req.valid("json")
		const jwtToken = await authService.verifyEmail(token)
		return c.json(
			{
				token: jwtToken,
				message: "Email verified successfully",
			},
			200,
		)
	},
)

authRoutes.openapi(
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
			403: {
				description: "Account suspended",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const { email, password } = c.req.valid("json")
		let token: string
		const wideEvent = c.get("wideEvent")
		try {
			token = await authService.login(email, password)
			if (wideEvent) wideEvent.auth = { outcome: "logged_in" }
		} catch (err) {
			if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
				if (wideEvent) wideEvent.auth = { outcome: "invalid_credentials" }
			}
			throw err
		}
		return c.json({ token }, 200)
	},
)

authRoutes.openapi(
	createRoute({
		method: "post",
		path: "/resend-verification",
		tags: ["Auth"],
		summary: "Resend verification email",
		request: {
			body: {
				content: {
					"application/json": {
						schema: ResendVerificationSchema,
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
		// Service swallows non-enumeration cases; a throw here is a real failure
		await authService.resendVerificationEmail(email)
		return c.json(
			{
				message: "If a registration exists, a verification email has been sent",
			},
			200,
		)
	},
)

authRoutes.openapi(
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
		// Service swallows non-enumeration cases; a throw here is a real failure
		await authService.requestPasswordReset(email)
		return c.json(
			{
				message:
					"If an account exists with this email, a password reset link has been sent",
			},
			200,
		)
	},
)

authRoutes.openapi(
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
						schema: successResponseSchema(z.object({ valid: z.literal(true) })),
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
		const isValid = await authService.verifyResetToken(token)
		if (!isValid) {
			throw new BadRequestError("INVALID_TOKEN", "Invalid or expired token")
		}
		return c.json({ valid: true as const }, 200)
	},
)

authRoutes.openapi(
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
		await authService.resetPassword(token, password)
		return c.json({ message: "Password reset successful" }, 200)
	},
)
