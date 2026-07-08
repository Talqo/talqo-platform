import { and, eq } from "drizzle-orm"
import type { McpRemoteServerConfig, McpServerConfigInput } from "shared"
import { NotFoundError } from "@/common/errors"
import type { DB } from "@/db"
import {
	clientPreMadeMcp,
	customMcpServers,
	preMadeMcpServers,
} from "@/db/schema"

export class McpRepository {
	constructor(private readonly db: DB) {}

	// ─── Pre-made servers ───────────────────────────────────────────────────────

	async listPreMadeServers(pagination?: { limit: number; offset: number }) {
		const query = this.db.select().from(preMadeMcpServers)
		if (!pagination) return query
		return query.limit(pagination.limit).offset(pagination.offset)
	}

	async getPreMadeServer(id: string) {
		return this.db
			.select()
			.from(preMadeMcpServers)
			.where(eq(preMadeMcpServers.id, id))
			.then((rows) => rows[0] ?? null)
	}

	async createPreMadeServer(
		name: string,
		description: string | undefined,
		mcpConfig: McpServerConfigInput,
	) {
		const [row] = await this.db
			.insert(preMadeMcpServers)
			.values({ name, description, mcpConfig })
			.returning()
		return row
	}

	async updatePreMadeServer(
		id: string,
		name: string,
		description: string | undefined,
		mcpConfig: McpServerConfigInput,
	) {
		const [row] = await this.db
			.update(preMadeMcpServers)
			.set({ name, description, mcpConfig })
			.where(eq(preMadeMcpServers.id, id))
			.returning()
		return row ?? null
	}

	async deletePreMadeServer(id: string) {
		const result = await this.db
			.delete(preMadeMcpServers)
			.where(eq(preMadeMcpServers.id, id))
			.returning()
		return result.length > 0
	}

	// ─── Client ↔ pre-made servers ──────────────────────────────────────────────

	async listEnabledPreMade(
		clientId: string,
		pagination?: { limit: number; offset: number },
	) {
		const query = this.db
			.select({ server: preMadeMcpServers })
			.from(clientPreMadeMcp)
			.innerJoin(
				preMadeMcpServers,
				eq(clientPreMadeMcp.preMadeMcpId, preMadeMcpServers.id),
			)
			.where(eq(clientPreMadeMcp.clientId, clientId))
		const rows = pagination
			? await query.limit(pagination.limit).offset(pagination.offset)
			: await query
		return rows.map((r) => r.server)
	}

	async enablePreMade(clientId: string, serverId: string) {
		try {
			await this.db
				.insert(clientPreMadeMcp)
				.values({ clientId, preMadeMcpId: serverId })
				.onConflictDoNothing()
		} catch (err) {
			// FK violation — the pre-made server was deleted between the caller's
			// existence check and this insert. The constraint already prevents a
			// ghost row from being created; translate it into a clean 404 instead
			// of letting the raw Postgres error surface.
			if (isForeignKeyViolation(err)) {
				throw new NotFoundError("Pre-made MCP server not found")
			}
			throw err
		}
	}

	async disablePreMade(clientId: string, serverId: string) {
		const result = await this.db
			.delete(clientPreMadeMcp)
			.where(
				and(
					eq(clientPreMadeMcp.clientId, clientId),
					eq(clientPreMadeMcp.preMadeMcpId, serverId),
				),
			)
			.returning()
		return result.length > 0
	}

	// ─── Custom MCP servers ─────────────────────────────────────────────────────

	async listCustomServers(
		clientId: string,
		pagination?: { limit: number; offset: number },
	) {
		const query = this.db
			.select()
			.from(customMcpServers)
			.where(eq(customMcpServers.clientId, clientId))
		if (!pagination) return query
		return query.limit(pagination.limit).offset(pagination.offset)
	}

	async getCustomServer(id: string, clientId: string) {
		return this.db
			.select()
			.from(customMcpServers)
			.where(
				and(
					eq(customMcpServers.id, id),
					eq(customMcpServers.clientId, clientId),
				),
			)
			.then((rows) => rows[0] ?? null)
	}

	async getCustomServerConfig(id: string, clientId: string) {
		return this.db
			.select({ mcpConfig: customMcpServers.mcpConfig })
			.from(customMcpServers)
			.where(
				and(
					eq(customMcpServers.id, id),
					eq(customMcpServers.clientId, clientId),
				),
			)
			.then(
				(rows) =>
					(rows[0]?.mcpConfig as McpRemoteServerConfig | undefined) ?? null,
			)
	}

	async getEnabledPreMadeConfig(serverId: string, clientId: string) {
		return this.db
			.select({ mcpConfig: preMadeMcpServers.mcpConfig })
			.from(clientPreMadeMcp)
			.innerJoin(
				preMadeMcpServers,
				eq(clientPreMadeMcp.preMadeMcpId, preMadeMcpServers.id),
			)
			.where(
				and(
					eq(clientPreMadeMcp.preMadeMcpId, serverId),
					eq(clientPreMadeMcp.clientId, clientId),
				),
			)
			.then(
				(rows) =>
					(rows[0]?.mcpConfig as McpRemoteServerConfig | undefined) ?? null,
			)
	}

	async createCustomServer(clientId: string, mcpConfig: McpRemoteServerConfig) {
		const [row] = await this.db
			.insert(customMcpServers)
			.values({ clientId, mcpConfig })
			.returning()
		return row
	}

	async updateCustomServer(
		id: string,
		clientId: string,
		mcpConfig: McpRemoteServerConfig,
	) {
		const [row] = await this.db
			.update(customMcpServers)
			.set({ mcpConfig })
			.where(
				and(
					eq(customMcpServers.id, id),
					eq(customMcpServers.clientId, clientId),
				),
			)
			.returning()
		return row ?? null
	}

	async deleteCustomServer(id: string, clientId: string) {
		const result = await this.db
			.delete(customMcpServers)
			.where(
				and(
					eq(customMcpServers.id, id),
					eq(customMcpServers.clientId, clientId),
				),
			)
			.returning()
		return result.length > 0
	}
}

function isForeignKeyViolation(err: unknown): boolean {
	return getPostgresErrorCode(err) === "23503"
}

// Drizzle wraps the underlying postgres.js error in a DrizzleQueryError,
// moving the real error code from `.code` to `.cause.code`.
function getPostgresErrorCode(err: unknown): string | undefined {
	if (typeof err !== "object" || err === null) return undefined
	if ("code" in err && typeof err.code === "string") return err.code
	if (
		"cause" in err &&
		typeof err.cause === "object" &&
		err.cause !== null &&
		"code" in err.cause &&
		typeof err.cause.code === "string"
	) {
		return err.cause.code
	}
	return undefined
}
