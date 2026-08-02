import { eq, sql } from "drizzle-orm"
import { CLIENT_STATUS_VALUES, type ClientStatus } from "shared"
import { getPostgresErrorCode } from "@/common/db-errors"
import {
	AuthConflictError,
	BadRequestError,
	NotFoundError,
} from "@/common/errors"
import type { DB } from "@/db"
import {
	clients,
	INITIAL_CLIENT_BALANCE_USD,
	passwordResetTokens,
	pendingRegistrations,
} from "@/db/schema"

export type Client = {
	id: string
	name: string
	email: string
	passwordHash: string
	status: ClientStatus
	balanceUsd: number
	monthlyUsageLimit: number
	tokenVersion: number
	lastActive: Date | null
	createdAt: Date
}

// Not in the ERD — CLIENT is created only after email verification.
export type PendingRegistration = {
	token: string
	name: string
	email: string
	passwordHash: string
	expiresAt: Date
	consumedAt?: Date | null
	consumedByClientId?: string | null
}

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect

export type AuthRepository = {
	findClientByEmail(email: string): Promise<Client | null>
	findClientById(id: string): Promise<Client | null>
	findClientByName(name: string): Promise<Client | null>
	findPendingByName(name: string): Promise<PendingRegistration | null>
	findPendingByEmail(email: string): Promise<PendingRegistration | null>
	findPendingByToken(token: string): Promise<PendingRegistration | null>
	createClient(
		data: Pick<Client, "name" | "email" | "passwordHash">,
	): Promise<Client>
	updateLastActive(clientId: string): Promise<void>
	// Overwrites same-email pending registrations; name conflicts must be rejected by caller first
	savePendingRegistration(record: PendingRegistration): Promise<void>
	// Uses SELECT FOR UPDATE + marks-instead-of-deletes to prevent double-consumption and support idempotency
	consumePendingRegistration(token: string): Promise<Client>
	findPasswordResetToken(token: string): Promise<PasswordResetToken | null>
	savePasswordResetToken(record: PasswordResetToken): Promise<void>
	consumePasswordResetToken(token: string): Promise<PasswordResetToken>
	updateClientPassword(email: string, passwordHash: string): Promise<void>
	consumeTokenAndUpdatePassword(
		token: string,
		passwordHash: string,
	): Promise<{ clientId: string; email: string }>
}

export class InMemoryAuthRepository implements AuthRepository {
	private clients = new Map<string, Client>()
	private pendingRegistrations = new Map<string, PendingRegistration>()
	private passwordResetTokens = new Map<string, PasswordResetToken>()

	async findClientByEmail(email: string): Promise<Client | null> {
		for (const client of this.clients.values()) {
			if (client.email === email) return client
		}
		return null
	}

	async findClientById(id: string): Promise<Client | null> {
		return this.clients.get(id) ?? null
	}

	async findClientByName(name: string): Promise<Client | null> {
		const normalizedName = name.toLowerCase()
		for (const client of this.clients.values()) {
			if (client.name.toLowerCase() === normalizedName) return client
		}
		return null
	}

	async findPendingByName(name: string): Promise<PendingRegistration | null> {
		const normalizedName = name.toLowerCase()
		for (const pending of this.pendingRegistrations.values()) {
			if (pending.name.toLowerCase() === normalizedName) return pending
		}
		return null
	}

	async findPendingByEmail(email: string): Promise<PendingRegistration | null> {
		const canonical = email.toLowerCase()
		for (const pending of this.pendingRegistrations.values()) {
			if (pending.email.toLowerCase() === canonical) return pending
		}
		return null
	}

	async findPendingByToken(token: string): Promise<PendingRegistration | null> {
		return this.pendingRegistrations.get(token) ?? null
	}

	async createClient(
		data: Pick<Client, "name" | "email" | "passwordHash">,
	): Promise<Client> {
		for (const client of this.clients.values()) {
			if (client.email === data.email)
				throw new AuthConflictError("EMAIL_TAKEN", "Email already registered")
		}
		const client: Client = {
			...data,
			id: crypto.randomUUID(),
			status: "active",
			balanceUsd: INITIAL_CLIENT_BALANCE_USD,
			monthlyUsageLimit: 0,
			tokenVersion: 0,
			lastActive: null,
			createdAt: new Date(),
		}
		this.clients.set(client.id, client)
		return client
	}

	async updateLastActive(clientId: string): Promise<void> {
		const client = this.clients.get(clientId)
		if (client)
			this.clients.set(clientId, { ...client, lastActive: new Date() })
	}

	async savePendingRegistration(record: PendingRegistration): Promise<void> {
		// overwrites same-email entry to support re-registration
		for (const [token, pending] of this.pendingRegistrations.entries()) {
			if (pending.email === record.email) {
				this.pendingRegistrations.delete(token)
				break
			}
		}
		this.pendingRegistrations.set(record.token, record)
	}

	async consumePendingRegistration(token: string): Promise<Client> {
		const record = this.pendingRegistrations.get(token)
		if (!record)
			throw new BadRequestError("INVALID_TOKEN", "Invalid or expired token")
		if (record.expiresAt < new Date())
			throw new BadRequestError("TOKEN_EXPIRED", "Token has expired")

		// If already consumed, return the existing client (idempotent)
		if (record.consumedAt && record.consumedByClientId) {
			const existingClient = this.clients.get(record.consumedByClientId)
			if (existingClient) return existingClient
			// If client somehow missing, continue to recreate
		}

		// token stays intact on EMAIL_TAKEN so caller can poll for the created client
		const client = await this.createClient({
			name: record.name,
			email: record.email,
			passwordHash: record.passwordHash,
		})

		record.consumedAt = new Date()
		record.consumedByClientId = client.id
		this.pendingRegistrations.set(token, record)

		return client
	}

	async findPasswordResetToken(
		token: string,
	): Promise<PasswordResetToken | null> {
		return this.passwordResetTokens.get(token) ?? null
	}

	async savePasswordResetToken(record: PasswordResetToken): Promise<void> {
		this.passwordResetTokens.set(record.token, record)
	}

	async consumePasswordResetToken(token: string): Promise<PasswordResetToken> {
		const record = this.passwordResetTokens.get(token)
		if (!record)
			throw new BadRequestError("INVALID_TOKEN", "Invalid or expired token")
		if (record.expiresAt < new Date())
			throw new BadRequestError("TOKEN_EXPIRED", "Token has expired")
		if (record.consumedAt)
			throw new BadRequestError(
				"TOKEN_ALREADY_USED",
				"Token has already been used",
			)

		record.consumedAt = new Date()
		this.passwordResetTokens.set(token, record)
		return record
	}

	async updateClientPassword(
		email: string,
		passwordHash: string,
	): Promise<void> {
		for (const client of this.clients.values()) {
			if (client.email === email) {
				client.passwordHash = passwordHash
				client.tokenVersion += 1
				return
			}
		}
		throw new NotFoundError("Client not found")
	}

	async consumeTokenAndUpdatePassword(
		token: string,
		passwordHash: string,
	): Promise<{ clientId: string; email: string }> {
		const record = this.passwordResetTokens.get(token)
		if (!record)
			throw new BadRequestError("INVALID_TOKEN", "Invalid or expired token")
		if (record.expiresAt < new Date())
			throw new BadRequestError("TOKEN_EXPIRED", "Token has expired")
		if (record.consumedAt)
			throw new BadRequestError(
				"TOKEN_ALREADY_USED",
				"Token has already been used",
			)

		const client = Array.from(this.clients.values()).find(
			(c) => c.email === record.email,
		)
		if (!client)
			throw new BadRequestError("INVALID_TOKEN", "Invalid or expired token")

		await this.updateClientPassword(record.email, passwordHash)

		// consume only after successful password update
		record.consumedAt = new Date()
		this.passwordResetTokens.set(token, record)

		return { clientId: client.id, email: record.email }
	}
}

function mapClient(row: typeof clients.$inferSelect): Client {
	const status = CLIENT_STATUS_VALUES.includes(row.status as ClientStatus)
		? (row.status as ClientStatus)
		: "active"
	return {
		id: row.id,
		name: row.name,
		email: row.email,
		passwordHash: row.passwordHash,
		status,
		balanceUsd: Number(row.balanceUsd),
		monthlyUsageLimit: Number(row.monthlyUsageLimit ?? 0),
		tokenVersion: row.tokenVersion,
		lastActive: row.lastActive,
		createdAt: row.createdAt,
	}
}

export class DrizzleAuthRepository implements AuthRepository {
	constructor(private readonly db: DB) {}

	async findClientByEmail(email: string): Promise<Client | null> {
		const rows = await this.db
			.select()
			.from(clients)
			.where(eq(clients.email, email))
		return rows[0] ? mapClient(rows[0]) : null
	}

	async findClientById(id: string): Promise<Client | null> {
		const rows = await this.db.select().from(clients).where(eq(clients.id, id))
		return rows[0] ? mapClient(rows[0]) : null
	}

	async findClientByName(name: string): Promise<Client | null> {
		const normalizedName = name.toLowerCase()
		const rows = await this.db
			.select()
			.from(clients)
			.where(sql`LOWER(${clients.name}) = ${normalizedName}`)
		return rows[0] ? mapClient(rows[0]) : null
	}

	async findPendingByName(name: string): Promise<PendingRegistration | null> {
		const normalizedName = name.toLowerCase()
		const rows = await this.db
			.select()
			.from(pendingRegistrations)
			.where(sql`LOWER(${pendingRegistrations.name}) = ${normalizedName}`)
		return rows[0] ?? null
	}

	async findPendingByEmail(email: string): Promise<PendingRegistration | null> {
		const canonical = email.toLowerCase()
		const rows = await this.db
			.select()
			.from(pendingRegistrations)
			.where(sql`LOWER(${pendingRegistrations.email}) = ${canonical}`)
		return rows[0] ?? null
	}

	async findPendingByToken(token: string): Promise<PendingRegistration | null> {
		const rows = await this.db
			.select()
			.from(pendingRegistrations)
			.where(eq(pendingRegistrations.token, token))
		return rows[0] ?? null
	}

	async createClient(
		data: Pick<Client, "name" | "email" | "passwordHash">,
	): Promise<Client> {
		try {
			const rows = await this.db.insert(clients).values(data).returning()
			// biome-ignore lint/style/noNonNullAssertion: insert always returns one row
			return mapClient(rows[0]!)
		} catch (err) {
			// postgres unique_violation code
			if (isUniqueViolation(err))
				throw new AuthConflictError("EMAIL_TAKEN", "Email already registered")
			throw err
		}
	}

	async updateLastActive(clientId: string): Promise<void> {
		await this.db
			.update(clients)
			.set({ lastActive: new Date() })
			.where(eq(clients.id, clientId))
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
			})
	}

	async consumePendingRegistration(token: string): Promise<Client> {
		return this.db.transaction(async (tx) => {
			const [pending] = await tx
				.select()
				.from(pendingRegistrations)
				.where(eq(pendingRegistrations.token, token))
				.for("update")

			if (!pending)
				throw new BadRequestError("INVALID_TOKEN", "Invalid or expired token")
			if (pending.expiresAt < new Date())
				throw new BadRequestError("TOKEN_EXPIRED", "Token has expired")

			if (pending.consumedAt && pending.consumedByClientId) {
				const existingClient = await this.findClientById(
					pending.consumedByClientId,
				)
				if (existingClient) return existingClient
			}

			let client: Client
			try {
				const rows = await tx
					.insert(clients)
					.values({
						name: pending.name,
						email: pending.email,
						passwordHash: pending.passwordHash,
					})
					.returning()
				// biome-ignore lint/style/noNonNullAssertion: insert always returns one row
				client = mapClient(rows[0]!)
			} catch (err) {
				if (isUniqueViolation(err))
					throw new AuthConflictError("EMAIL_TAKEN", "Email already registered")
				throw err
			}

			await tx
				.update(pendingRegistrations)
				.set({
					consumedAt: new Date(),
					consumedByClientId: client.id,
				})
				.where(eq(pendingRegistrations.token, token))

			return client
		})
	}

	async findPasswordResetToken(
		token: string,
	): Promise<PasswordResetToken | null> {
		const rows = await this.db
			.select()
			.from(passwordResetTokens)
			.where(eq(passwordResetTokens.token, token))
		return rows[0] ?? null
	}

	async savePasswordResetToken(record: PasswordResetToken): Promise<void> {
		await this.db.insert(passwordResetTokens).values(record)
	}

	async consumePasswordResetToken(token: string): Promise<PasswordResetToken> {
		return this.db.transaction(async (tx) => {
			const [record] = await tx
				.select()
				.from(passwordResetTokens)
				.where(eq(passwordResetTokens.token, token))
				.for("update")

			if (!record)
				throw new BadRequestError("INVALID_TOKEN", "Invalid or expired token")
			if (record.expiresAt < new Date())
				throw new BadRequestError("TOKEN_EXPIRED", "Token has expired")
			if (record.consumedAt)
				throw new BadRequestError(
					"TOKEN_ALREADY_USED",
					"Token has already been used",
				)

			const consumedAt = new Date()
			await tx
				.update(passwordResetTokens)
				.set({ consumedAt })
				.where(eq(passwordResetTokens.token, token))

			// return with consumedAt set so callers see the consumed state immediately
			return { ...record, consumedAt }
		})
	}

	async updateClientPassword(
		email: string,
		passwordHash: string,
	): Promise<void> {
		const rows = await this.db
			.update(clients)
			.set({ passwordHash, tokenVersion: sql`${clients.tokenVersion} + 1` })
			.where(eq(clients.email, email))
			.returning({ id: clients.id })
		if (rows.length === 0) {
			throw new NotFoundError("Client not found")
		}
	}

	async consumeTokenAndUpdatePassword(
		token: string,
		passwordHash: string,
	): Promise<{ clientId: string; email: string }> {
		return this.db.transaction(async (tx) => {
			const [record] = await tx
				.select({
					email: passwordResetTokens.email,
					expiresAt: passwordResetTokens.expiresAt,
					consumedAt: passwordResetTokens.consumedAt,
				})
				.from(passwordResetTokens)
				.where(eq(passwordResetTokens.token, token))
				.for("update")

			if (!record)
				throw new BadRequestError("INVALID_TOKEN", "Invalid or expired token")
			if (record.expiresAt < new Date())
				throw new BadRequestError("TOKEN_EXPIRED", "Token has expired")
			if (record.consumedAt)
				throw new BadRequestError(
					"TOKEN_ALREADY_USED",
					"Token has already been used",
				)

			const [updated] = await tx
				.update(clients)
				.set({ passwordHash, tokenVersion: sql`${clients.tokenVersion} + 1` })
				.where(eq(clients.email, record.email))
				.returning({ id: clients.id })

			// treat missing client as invalid token to avoid leaking whether the email exists
			if (!updated)
				throw new BadRequestError("INVALID_TOKEN", "Invalid or expired token")

			// consume only after successful password update
			await tx
				.update(passwordResetTokens)
				.set({ consumedAt: new Date() })
				.where(eq(passwordResetTokens.token, token))

			return { clientId: updated.id, email: record.email }
		})
	}
}

function isUniqueViolation(err: unknown): boolean {
	return getPostgresErrorCode(err) === "23505"
}
