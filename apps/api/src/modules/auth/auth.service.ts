import { ConflictError, UnauthorizedError } from "../../common/errors";
import { signToken } from "../../common/jwt";
import type { AuthRepository } from "./auth.repository";

export class AuthService {
	constructor(private readonly repo: AuthRepository) {}

	async register(data: { name: string; email: string; password: string }) {
		const existing = await this.repo.findClientByEmail(data.email);
		if (existing) {
			throw new ConflictError("Email already registered");
		}

		const passwordHash = await Bun.password.hash(data.password, {
			algorithm: "argon2id",
		});

		const client = await this.repo.createClient({
			name: data.name,
			email: data.email,
			passwordHash,
		});

		const token = await signToken({ sub: client.id, role: "client" });

		return {
			token,
			client: {
				id: client.id,
				name: client.name,
				email: client.email,
				createdAt: client.createdAt,
			},
		};
	}

	async login(data: { email: string; password: string }) {
		const client = await this.repo.findClientByEmail(data.email);
		if (!client) {
			throw new UnauthorizedError("Invalid email or password");
		}

		const valid = await Bun.password.verify(data.password, client.passwordHash);
		if (!valid) {
			throw new UnauthorizedError("Invalid email or password");
		}

		if (client.status === "suspended") {
			throw new UnauthorizedError("Account suspended");
		}

		await this.repo.updateLastActive(client.id);

		const token = await signToken({ sub: client.id, role: "client" });

		return {
			token,
			client: {
				id: client.id,
				name: client.name,
				email: client.email,
			},
		};
	}
}
