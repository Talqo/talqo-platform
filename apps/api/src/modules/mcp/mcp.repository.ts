import { and, eq } from "drizzle-orm"
import type { DB } from "../../db"
import {
	clientPreMadeMcp,
	customMcpServers,
	preMadeMcpServers,
} from "../../db/schema"

export class McpRepository {
	constructor(private readonly db: DB) {}

	// ─── Pre-made servers ───────────────────────────────────────────────────────

	async listPreMadeServers() {
		return this.db.select().from(preMadeMcpServers)
	}

	async getPreMadeServer(id: string) {
		return this.db
			.select()
			.from(preMadeMcpServers)
			.where(eq(preMadeMcpServers.id, id))
			.then((rows) => rows[0] ?? null)
	}

	async createPreMadeServer(mcpConfig: unknown) {
		const [row] = await this.db
			.insert(preMadeMcpServers)
			.values({ mcpConfig })
			.returning()
		return row
	}

	async updatePreMadeServer(id: string, mcpConfig: unknown) {
		const [row] = await this.db
			.update(preMadeMcpServers)
			.set({ mcpConfig })
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

	async listEnabledPreMade(clientId: string) {
		return this.db
			.select({ server: preMadeMcpServers })
			.from(clientPreMadeMcp)
			.innerJoin(
				preMadeMcpServers,
				eq(clientPreMadeMcp.preMadeMcpId, preMadeMcpServers.id),
			)
			.where(eq(clientPreMadeMcp.clientId, clientId))
			.then((rows) => rows.map((r) => r.server))
	}

	async enablePreMade(clientId: string, serverId: string) {
		await this.db
			.insert(clientPreMadeMcp)
			.values({ clientId, preMadeMcpId: serverId })
			.onConflictDoNothing()
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

	async listCustomServers(clientId: string) {
		return this.db
			.select()
			.from(customMcpServers)
			.where(eq(customMcpServers.clientId, clientId))
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

	async createCustomServer(clientId: string, mcpConfig: unknown) {
		const [row] = await this.db
			.insert(customMcpServers)
			.values({ clientId, mcpConfig })
			.returning()
		return row
	}

	async updateCustomServer(id: string, clientId: string, mcpConfig: unknown) {
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
