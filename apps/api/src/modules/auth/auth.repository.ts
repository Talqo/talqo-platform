import { eq } from "drizzle-orm";
import type { DB } from "../../db";
import { botConfigs, clients } from "../../db/schema";

export class AuthRepository {
	constructor(private readonly db: DB) {}

	async findClientByEmail(email: string) {
		return this.db
			.select()
			.from(clients)
			.where(eq(clients.email, email))
			.then((rows) => rows[0] ?? null);
	}

	async findClientById(id: string) {
		return this.db
			.select()
			.from(clients)
			.where(eq(clients.id, id))
			.then((rows) => rows[0] ?? null);
	}

	async createClient(data: {
		name: string;
		email: string;
		passwordHash: string;
	}) {
		return this.db.transaction(async (tx) => {
			const [client] = await tx.insert(clients).values(data).returning();

			await tx.insert(botConfigs).values({ clientId: client.id });

			return client;
		});
	}

	async updateLastActive(id: string) {
		return this.db
			.update(clients)
			.set({ lastActive: new Date() })
			.where(eq(clients.id, id));
	}
}
