import {
	sendPasswordResetEmail,
	sendVerificationEmail,
} from "@/common/email/email.service"
import {
	AuthConflictError,
	EmailDeliveryError,
	ForbiddenError,
	UnauthorizedError,
} from "@/common/errors"
import { signToken } from "@/common/jwt"
import { logger } from "@/common/logger"
import type { AuthRepository } from "./auth.repository"

export class AuthService {
	constructor(private readonly repo: AuthRepository) {}

	async register(name: string, email: string, password: string): Promise<void> {
		const canonical = email.trim().toLowerCase()
		const existing = await this.repo.findClientByEmail(canonical)
		if (existing)
			throw new AuthConflictError(
				"EMAIL_TAKEN",
				"This email is already registered",
			)

		const canonicalName = name.trim().toLowerCase()
		const existingName = await this.repo.findClientByName(canonicalName)
		if (existingName)
			throw new AuthConflictError("NAME_TAKEN", "This name is already taken")

		// Also check pending registrations for name conflicts
		const pendingName = await this.repo.findPendingByName(canonicalName)
		if (pendingName)
			throw new AuthConflictError("NAME_TAKEN", "This name is already taken")

		const pendingEmail = await this.repo.findPendingByEmail(canonical)
		if (pendingEmail && pendingEmail.expiresAt >= new Date()) {
			throw new AuthConflictError(
				"EMAIL_TAKEN",
				"This email is already registered",
			)
		}

		const passwordHash = await Bun.password.hash(password)

		// Create pending registration and send verification email
		const token = crypto.randomUUID()
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

		await this.repo.savePendingRegistration({
			token,
			name: canonicalName,
			email: canonical,
			passwordHash,
			expiresAt,
		})

		logger.info("Sending verification email", { email: canonical })
		try {
			await sendVerificationEmail(canonical, token)
		} catch (err) {
			logger.error("Failed to send verification email", { error: err })
			throw new EmailDeliveryError("Failed to send verification email")
		}
	}

	async verifyEmail(token: string): Promise<string> {
		try {
			// consumePendingRegistration atomically validates the token, creates the
			// Client, and marks the pending registration as consumed in one repo transaction.
			// If already consumed, returns the existing client (idempotent - handles StrictMode double-mount).
			const client = await this.repo.consumePendingRegistration(token)

			// Update last active timestamp
			await this.repo.updateLastActive(client.id)

			// Return JWT token for auto-login
			return signToken({
				sub: client.id,
				role: "client",
				tokenVersion: client.tokenVersion,
			})
		} catch (err) {
			// EMAIL_TAKEN means a client with this email was already created by a concurrent request.
			// The token may now be marked as consumed. Poll for the client to be created.
			if (err instanceof Error && err.message === "EMAIL_TAKEN") {
				// Poll up to 5 times at 25ms intervals (total 125ms max wait)
				for (let attempt = 0; attempt < 5; attempt++) {
					await new Promise((resolve) => setTimeout(resolve, 25))
					const pending = await this.repo.findPendingByToken(token)
					if (pending?.consumedByClientId) {
						const client = await this.repo.findClientById(
							pending.consumedByClientId,
						)
						if (client) {
							await this.repo.updateLastActive(client.id)
							return signToken({
								sub: client.id,
								role: "client",
								tokenVersion: client.tokenVersion,
							})
						}
					}
				}

				// If we can't find the client after polling, the email really is taken by someone else
				throw new AuthConflictError(
					"EMAIL_ALREADY_VERIFIED",
					"Email already verified",
				)
			}
			throw err
		}
	}

	async login(email: string, password: string): Promise<string> {
		const client = await this.repo.findClientByEmail(email.trim().toLowerCase())
		// Return same error for missing client and wrong password to avoid user enumeration
		if (
			!client ||
			!(await Bun.password.verify(password, client.passwordHash))
		) {
			throw new UnauthorizedError("Invalid credentials")
		}

		if (client.status === "suspended") {
			throw new ForbiddenError(
				"Your account has been suspended. Please contact support.",
			)
		}

		await this.repo.updateLastActive(client.id)

		// Use centralized signToken that includes role claim
		return signToken({
			sub: client.id,
			role: "client",
			tokenVersion: client.tokenVersion,
		})
	}

	async resendVerificationEmail(email: string): Promise<void> {
		const canonical = email.trim().toLowerCase()

		// Check if already registered
		const existing = await this.repo.findClientByEmail(canonical)
		if (existing) {
			// Don't reveal that email is registered - return silently
			logger.info("Resend skipped - email already registered", {
				email: canonical,
			})
			return
		}

		// Find pending registration
		const pending = await this.repo.findPendingByEmail(canonical)
		if (!pending) {
			// No pending registration found - don't reveal this
			logger.info("Resend skipped - no pending registration", {
				email: canonical,
			})
			return
		}

		// Check if expired
		if (pending.expiresAt < new Date()) {
			// Token expired - don't reveal this
			logger.info("Resend skipped - token expired", { email: canonical })
			return
		}

		// Resend email with existing token
		logger.info("Resending verification email", { email: canonical })
		await sendVerificationEmail(canonical, pending.token)
	}

	async requestPasswordReset(email: string): Promise<void> {
		const canonical = email.trim().toLowerCase()

		// Always return success to prevent user enumeration
		// Only send email if client exists
		const client = await this.repo.findClientByEmail(canonical)
		if (!client) {
			logger.info("Password reset requested for non-existent email", {
				email: canonical,
			})
			return
		}

		// Treat like non-existent to avoid revealing suspension status
		if (client.status === "suspended") {
			logger.info("Password reset requested for suspended account", {
				email: canonical,
			})
			return
		}

		// Generate token with 1-hour expiry
		const token = crypto.randomUUID()
		const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

		await this.repo.savePasswordResetToken({
			token,
			email: canonical,
			expiresAt,
			consumedAt: null,
		})

		logger.info("Sending password reset email", { email: canonical })
		await sendPasswordResetEmail(canonical, token)
	}

	async resetPassword(token: string, newPassword: string): Promise<void> {
		// Requester already holds a token emailed to the owner — no enumeration risk
		const record = await this.repo.findPasswordResetToken(token)
		if (record) {
			const client = await this.repo.findClientByEmail(record.email)
			if (client?.status === "suspended") {
				throw new UnauthorizedError(
					"Your account has been suspended. Please contact support.",
				)
			}
		}

		const passwordHash = await Bun.password.hash(newPassword)
		const result = await this.repo.consumeTokenAndUpdatePassword(
			token,
			passwordHash,
		)

		logger.info("Password reset successful", {
			clientId: result.clientId,
			email: result.email,
		})
	}

	async verifyResetToken(token: string): Promise<boolean> {
		const record = await this.repo.findPasswordResetToken(token)
		if (!record) return false
		if (record.expiresAt < new Date()) return false
		if (record.consumedAt) return false
		return true
	}
}
