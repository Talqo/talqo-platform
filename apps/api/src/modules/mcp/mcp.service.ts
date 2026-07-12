import type {
	McpRemoteServerConfig,
	McpServerConfig,
	McpServerConfigInput,
} from "shared"
import { mcpServerConfigSchema } from "shared"
import { NotFoundError, ValidationError } from "@/common/errors"
import type { McpRepository } from "./mcp.repository"

export class McpService {
	constructor(private readonly repo: McpRepository) {}

	// ─── Pre-made (admin) ────────────────────────────────────────────────────────

	async listPreMadeServers(pagination?: { limit: number; offset: number }) {
		return this.repo.listPreMadeServers(pagination)
	}

	async createPreMadeServer(
		name: string,
		description: string | undefined,
		mcpConfig: McpServerConfigInput,
	) {
		return this.repo.createPreMadeServer(name, description, mcpConfig)
	}

	async updatePreMadeServer(
		serverId: string,
		name: string,
		description: string | undefined,
		mcpConfig: McpServerConfigInput,
	) {
		const updated = await this.repo.updatePreMadeServer(
			serverId,
			name,
			description,
			mcpConfig,
		)
		if (!updated) throw new NotFoundError("Pre-made MCP server not found")
		return updated
	}

	async deletePreMadeServer(serverId: string) {
		const deleted = await this.repo.deletePreMadeServer(serverId)
		if (!deleted) throw new NotFoundError("Pre-made MCP server not found")
	}

	// ─── Client ↔ pre-made ───────────────────────────────────────────────────────

	async listEnabledPreMade(
		clientId: string,
		pagination?: { limit: number; offset: number },
	) {
		return this.repo.listEnabledPreMade(clientId, pagination)
	}

	async enablePreMade(clientId: string, serverId: string) {
		const server = await this.repo.getPreMadeServer(serverId)
		if (!server) throw new NotFoundError("Pre-made MCP server not found")
		await this.repo.enablePreMade(clientId, serverId)
	}

	async disablePreMade(clientId: string, serverId: string) {
		const disabled = await this.repo.disablePreMade(clientId, serverId)
		if (!disabled) throw new NotFoundError("Pre-made MCP server not enabled")
	}

	// ─── Custom servers ──────────────────────────────────────────────────────────

	async listCustomServers(
		clientId: string,
		pagination?: { limit: number; offset: number },
	) {
		return this.repo.listCustomServers(clientId, pagination)
	}

	async createCustomServer(clientId: string, mcpConfig: McpRemoteServerConfig) {
		return this.repo.createCustomServer(clientId, mcpConfig)
	}

	async updateCustomServer(
		clientId: string,
		serverId: string,
		mcpConfig: McpRemoteServerConfig,
	) {
		const updated = await this.repo.updateCustomServer(
			serverId,
			clientId,
			mcpConfig,
		)
		if (!updated) throw new NotFoundError("Custom MCP server not found")
		return updated
	}

	async deleteCustomServer(clientId: string, serverId: string) {
		const deleted = await this.repo.deleteCustomServer(serverId, clientId)
		if (!deleted) throw new NotFoundError("Custom MCP server not found")
	}

	// ─── Verify helpers ──────────────────────────────────────────────────────────

	async getCustomServerConfig(
		clientId: string,
		serverId: string,
	): Promise<McpServerConfig> {
		const raw = await this.repo.getCustomServerConfig(serverId, clientId)
		if (!raw) throw new NotFoundError("Custom MCP server not found")
		const parsed = mcpServerConfigSchema.safeParse(raw)
		if (!parsed.success)
			throw new ValidationError("Invalid custom MCP server config")
		return parsed.data
	}

	async getEnabledPreMadeConfig(
		clientId: string,
		serverId: string,
	): Promise<McpServerConfig> {
		const raw = await this.repo.getEnabledPreMadeConfig(serverId, clientId)
		if (!raw) throw new NotFoundError("Pre-made MCP server not enabled")
		const parsed = mcpServerConfigSchema.safeParse(raw)
		if (!parsed.success)
			throw new ValidationError("Invalid pre-made MCP server config")
		return parsed.data
	}
}
