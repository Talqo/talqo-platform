import type { McpRemoteServerConfig, McpServerConfigInput } from "shared"
import { NotFoundError } from "../../common/errors"
import type { McpRepository } from "./mcp.repository"

export class McpService {
	constructor(private readonly repo: McpRepository) {}

	// ─── Pre-made (admin) ────────────────────────────────────────────────────────

	async listPreMadeServers() {
		return this.repo.listPreMadeServers()
	}

	async createPreMadeServer(mcpConfig: McpServerConfigInput) {
		return this.repo.createPreMadeServer(mcpConfig)
	}

	async updatePreMadeServer(serverId: string, mcpConfig: McpServerConfigInput) {
		const updated = await this.repo.updatePreMadeServer(serverId, mcpConfig)
		if (!updated) throw new NotFoundError("Pre-made MCP server not found")
		return updated
	}

	async deletePreMadeServer(serverId: string) {
		const deleted = await this.repo.deletePreMadeServer(serverId)
		if (!deleted) throw new NotFoundError("Pre-made MCP server not found")
	}

	// ─── Client ↔ pre-made ───────────────────────────────────────────────────────

	async listEnabledPreMade(clientId: string) {
		return this.repo.listEnabledPreMade(clientId)
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

	async listCustomServers(clientId: string) {
		return this.repo.listCustomServers(clientId)
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
}
