import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { LoginSchema, RegisterSchema, VerifyEmailSchema } from "shared";
import type { AuthService } from "./auth.service";

export function createAuthRouter(service: AuthService): Hono {
	const router = new Hono();

	router.post("/register", zValidator("json", RegisterSchema), async (c) => {
		const { name, email, password } = c.req.valid("json");
		try {
			await service.register(name, email, password);
			return c.json({ success: true, message: "Verification email sent" }, 201);
		} catch (err) {
			if (err instanceof Error && err.message === "EMAIL_TAKEN") {
				// Return same response as success to prevent account enumeration
				console.error("Registration attempted with taken email");
				return c.json(
					{ success: true, message: "Verification email sent" },
					201,
				);
			}
			throw err;
		}
	});

	router.get(
		"/verify-email",
		zValidator("query", VerifyEmailSchema),
		async (c) => {
			const { token } = c.req.valid("query");
			try {
				await service.verifyEmail(token);
				return c.json({
					success: true,
					message: "Email verified successfully",
				});
			} catch (err) {
				if (err instanceof Error) {
					if (
						err.message === "INVALID_TOKEN" ||
						err.message === "TOKEN_EXPIRED"
					) {
						return c.json(
							{ success: false, message: "Invalid or expired token" },
							400,
						);
					}
					if (err.message === "EMAIL_ALREADY_VERIFIED") {
						return c.json(
							{ success: false, message: "Email already verified" },
							409,
						);
					}
				}
				throw err;
			}
		},
	);

	router.post("/login", zValidator("json", LoginSchema), async (c) => {
		const { email, password } = c.req.valid("json");
		try {
			const token = await service.login(email, password);
			return c.json({
				success: true,
				message: "Login successful",
				data: { token },
			});
		} catch (err) {
			if (err instanceof Error) {
				if (err.message === "INVALID_CREDENTIALS") {
					return c.json(
						{ success: false, message: "Invalid credentials" },
						401,
					);
				}
			}
			throw err;
		}
	});

	return router;
}
