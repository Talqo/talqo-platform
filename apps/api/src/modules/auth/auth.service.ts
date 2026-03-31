import { sign } from "hono/jwt";
import { sendVerificationEmail } from "../../common/email/email.service";
import type { IAuthRepository } from "./auth.repository";

const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const JWT_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

type EmailSender = (to: string, token: string) => Promise<void>;

export class AuthService {
	constructor(
		private readonly repo: IAuthRepository,
		private readonly sendEmail: EmailSender = sendVerificationEmail,
	) {}

	async register(name: string, email: string, password: string): Promise<void> {
		const canonical = email.trim().toLowerCase();
		const existing = await this.repo.findClientByEmail(canonical);
		if (existing) throw new Error("EMAIL_TAKEN");

		const passwordHash = await Bun.password.hash(password);
		const token = crypto.randomUUID();

		// Store registration data until the email is verified;
		// the CLIENT record is created only after successful verification
		await this.repo.savePendingRegistration({
			token,
			name,
			email: canonical,
			passwordHash,
			expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS),
		});

		await this.sendEmail(canonical, token);
	}

	async verifyEmail(token: string): Promise<void> {
		try {
			// consumePendingRegistration atomically validates the token, creates the
			// Client, and removes the pending registration in one repo transaction.
			await this.repo.consumePendingRegistration(token);
		} catch (err) {
			// EMAIL_TAKEN means a client with this email was already created
			// (e.g., a concurrent verify succeeded first).
			if (err instanceof Error && err.message === "EMAIL_TAKEN") {
				throw new Error("EMAIL_ALREADY_VERIFIED");
			}
			throw err;
		}
	}

	async login(email: string, password: string): Promise<string> {
		const client = await this.repo.findClientByEmail(
			email.trim().toLowerCase(),
		);
		// Return same error for missing client and wrong password to avoid user enumeration
		if (
			!client ||
			!(await Bun.password.verify(password, client.passwordHash))
		) {
			throw new Error("INVALID_CREDENTIALS");
		}

		const secret = process.env.JWT_SECRET;
		if (!secret) throw new Error("JWT_SECRET environment variable is not set");

		await this.repo.updateLastActive(client.id);

		return sign(
			{
				sub: client.id,
				email: client.email,
				exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY_SECONDS,
			},
			secret,
		);
	}
}
