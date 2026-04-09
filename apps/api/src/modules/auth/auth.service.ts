import { sendVerificationEmail } from "../../common/email/email.service";
import { signToken } from "../../common/jwt";
import type { IAuthRepository } from "./auth.repository";

export class AuthService {
	constructor(private readonly repo: IAuthRepository) {}

	async register(name: string, email: string, password: string): Promise<void> {
		const canonical = email.trim().toLowerCase();
		const existing = await this.repo.findClientByEmail(canonical);
		if (existing) throw new Error("EMAIL_TAKEN");

		const passwordHash = await Bun.password.hash(password);

		// Create pending registration and send verification email
		const token = crypto.randomUUID();
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

		await this.repo.savePendingRegistration({
			token,
			name,
			email: canonical,
			passwordHash,
			expiresAt,
		});

		await sendVerificationEmail(canonical, token);
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

		await this.repo.updateLastActive(client.id);

		// Use centralized signToken that includes role claim
		return signToken({
			sub: client.id,
			role: "client",
		});
	}
}
