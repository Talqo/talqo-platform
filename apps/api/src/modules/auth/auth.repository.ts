import { eq, sql } from "drizzle-orm";
import type { DB } from "../../db";
import { clients, pendingRegistrations } from "../../db/schema";

// Matches the CLIENT entity in the ERD
export type Client = {
	id: string;
	name: string;
	email: string;
	passwordHash: string;
	balanceUsd: number;
	monthlyUsageLimit: number;
	lastActive: Date | null;
	createdAt: Date;
};

// Not in the ERD — transient storage for unverified registrations.
// A CLIENT record is only created after email verification, so no verified flag is needed.
export type PendingRegistration = {
	token: string;
	name: string;
	email: string;
	passwordHash: string;
	expiresAt: Date;
};

export interface IAuthRepository {
	findClientByEmail(email: string): Promise<Client | null>;
	findClientById(id: string): Promise<Client | null>;
	findClientByName(name: string): Promise<Client | null>;
	createClient(
		data: Pick<Client, "name" | "email" | "passwordHash">,
	): Promise<Client>;
	updateLastActive(clientId: string): Promise<void>;
	// Overwrites any existing pending registration for the same email
	savePendingRegistration(record: PendingRegistration): Promise<void>;
	// Atomically verifies the token, creates the Client record, and deletes the pending
	// registration in a single transaction (e.g., SELECT … FOR UPDATE in a DB impl).
	// The deletion happens only after successful creation, so a failed creation leaves
	// the token intact and the operation is retry-safe.
	// Callers must NOT call createClient separately for this flow.
	// Throws INVALID_TOKEN if no pending registration exists for the token.
	// Throws TOKEN_EXPIRED if the registration has expired.
	// Throws EMAIL_TAKEN if a client with this email already exists.
	consumePendingRegistration(token: string): Promise<Client>;
}

export class InMemoryAuthRepository implements IAuthRepository {
	private clients = new Map<string, Client>();
	private pendingRegistrations = new Map<string, PendingRegistration>();

	async findClientByEmail(email: string): Promise<Client | null> {
		for (const client of this.clients.values()) {
			if (client.email === email) return client;
		}
		return null;
	}

	async findClientById(id: string): Promise<Client | null> {
		return this.clients.get(id) ?? null;
	}

	async findClientByName(name: string): Promise<Client | null> {
		for (const client of this.clients.values()) {
			if (client.name === name) return client;
		}
		return null;
	}

	async createClient(
		data: Pick<Client, "name" | "email" | "passwordHash">,
	): Promise<Client> {
		for (const client of this.clients.values()) {
			if (client.email === data.email) throw new Error("EMAIL_TAKEN");
		}
		const client: Client = {
			...data,
			id: crypto.randomUUID(),
			balanceUsd: 0,
			monthlyUsageLimit: 0,
			lastActive: null,
			createdAt: new Date(),
		};
		this.clients.set(client.id, client);
		return client;
	}

	async updateLastActive(clientId: string): Promise<void> {
		const client = this.clients.get(clientId);
		if (client)
			this.clients.set(clientId, { ...client, lastActive: new Date() });
	}

	async savePendingRegistration(record: PendingRegistration): Promise<void> {
		// Remove any existing pending entry for the same email before saving
		for (const [token, pending] of this.pendingRegistrations.entries()) {
			if (pending.email === record.email) {
				this.pendingRegistrations.delete(token);
				break;
			}
		}
		this.pendingRegistrations.set(record.token, record);
	}

	// Single-threaded: no await points between the get, createClient, and delete,
	// so the whole sequence is effectively atomic for this in-memory implementation.
	async consumePendingRegistration(token: string): Promise<Client> {
		const record = this.pendingRegistrations.get(token);
		if (!record) throw new Error("INVALID_TOKEN");
		if (record.expiresAt < new Date()) throw new Error("TOKEN_EXPIRED");
		// createClient throws EMAIL_TAKEN on duplicate; the token stays intact so
		// the caller can detect the conflict and retry or surface an error.
		const client = await this.createClient({
			name: record.name,
			email: record.email,
			passwordHash: record.passwordHash,
		});
		// Delete only after successful creation to preserve retry-safety.
		this.pendingRegistrations.delete(token);
		return client;
	}
}

function mapClient(row: typeof clients.$inferSelect): Client {
	return {
		id: row.id,
		name: row.name,
		email: row.email,
		passwordHash: row.passwordHash,
		balanceUsd: Number(row.balanceUsd),
		monthlyUsageLimit: Number(row.monthlyUsageLimit ?? 0),
		lastActive: row.lastActive,
		createdAt: row.createdAt,
	};
}

export class DrizzleAuthRepository implements IAuthRepository {
	constructor(private readonly db: DB) {}

	async findClientByEmail(email: string): Promise<Client | null> {
		const rows = await this.db
			.select()
			.from(clients)
			.where(eq(clients.email, email));
		return rows[0] ? mapClient(rows[0]) : null;
	}

	async findClientById(id: string): Promise<Client | null> {
		const rows = await this.db.select().from(clients).where(eq(clients.id, id));
		return rows[0] ? mapClient(rows[0]) : null;
	}

	async findClientByName(name: string): Promise<Client | null> {
		// Case-insensitive comparison: name is already lowercased by caller
		const rows = await this.db
			.select()
			.from(clients)
			.where(sql`LOWER(${clients.name}) = ${name}`);
		return rows[0] ? mapClient(rows[0]) : null;
	}

	async createClient(
		data: Pick<Client, "name" | "email" | "passwordHash">,
	): Promise<Client> {
		try {
			const rows = await this.db.insert(clients).values(data).returning();
			// biome-ignore lint/style/noNonNullAssertion: insert always returns one row
			return mapClient(rows[0]!);
		} catch (err) {
			// postgres unique_violation code
			if (isUniqueViolation(err)) throw new Error("EMAIL_TAKEN");
			throw err;
		}
	}

	async updateLastActive(clientId: string): Promise<void> {
		await this.db
			.update(clients)
			.set({ lastActive: new Date() })
			.where(eq(clients.id, clientId));
	}

	async savePendingRegistration(record: PendingRegistration): Promise<void> {
		await this.db
			.insert(pendingRegistrations)
			.values(record)
			.onConflictDoUpdate({
				target: pendingRegistrations.email,
				set: {
					token: record.token,
					name: record.name,
					passwordHash: record.passwordHash,
					expiresAt: record.expiresAt,
				},
			});
	}

	async consumePendingRegistration(token: string): Promise<Client> {
		return this.db.transaction(async (tx: DB) => {
			const [pending] = await tx
				.select()
				.from(pendingRegistrations)
				.where(eq(pendingRegistrations.token, token));

			if (!pending) throw new Error("INVALID_TOKEN");
			if (pending.expiresAt < new Date()) throw new Error("TOKEN_EXPIRED");

			let client: Client;
			try {
				const rows = await tx
					.insert(clients)
					.values({
						name: pending.name,
						email: pending.email,
						passwordHash: pending.passwordHash,
					})
					.returning();
				// biome-ignore lint/style/noNonNullAssertion: insert always returns one row
				client = mapClient(rows[0]!);
			} catch (err) {
				if (isUniqueViolation(err)) throw new Error("EMAIL_TAKEN");
				throw err;
			}

			await tx
				.delete(pendingRegistrations)
				.where(eq(pendingRegistrations.token, token));

			return client;
		});
	}
}

function isUniqueViolation(err: unknown): boolean {
	return (
		typeof err === "object" &&
		err !== null &&
		"code" in err &&
		(err as { code: string }).code === "23505"
	);
}
