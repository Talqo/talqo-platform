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
	// TODO: enforce a unique index on clients.email in the DB migration
	// so the DB itself rejects duplicates and throws EMAIL_TAKEN on conflict.
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

// TODO: replace InMemoryAuthRepository with a DrizzleAuthRepository that reads/writes
// the CLIENT and a pending_registrations table (or equivalent) from packages/db.
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
