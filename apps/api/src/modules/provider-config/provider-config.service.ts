import type { AiProviderConfig, ProviderType } from "shared"
import { upsertProviderConfigBodySchema } from "shared"
import { getDefaultProviderConfig } from "@/common/config"
import { decrypt, encrypt } from "@/common/crypto"
import { BadRequestError, NotFoundError } from "@/common/errors"
import type { ProviderConfigRepository } from "./provider-config.repository"

type UpsertInput = {
	providerType: ProviderType
	apiKey: string
	model: string
	baseUrl?: string
	embeddingModel?: string
}

function maskApiKey(apiKey: string): string {
	if (apiKey.length <= 4) return "****"
	return `****${apiKey.slice(-4)}`
}

export class ProviderConfigService {
	constructor(private readonly repo: ProviderConfigRepository) {}

	async getConfig(clientId: string) {
		const row = await this.repo.getByClientId(clientId)
		if (!row) return null

		const plainKey = await decrypt(row.apiKeyEncrypted)

		return {
			id: row.id,
			clientId: row.clientId,
			providerType: row.providerType,
			apiKeyMasked: maskApiKey(plainKey),
			model: row.model,
			embeddingModel: row.embeddingModel,
			baseUrl: row.baseUrl,
			updatedAt: row.updatedAt.toISOString(),
		}
	}

	async upsertConfig(clientId: string, input: UpsertInput) {
		const apiKeyEncrypted = await encrypt(input.apiKey)
		const row = await this.repo.upsert(clientId, {
			providerType: input.providerType,
			apiKeyEncrypted,
			model: input.model,
			baseUrl: input.baseUrl ?? null,
			embeddingModel: input.embeddingModel ?? null,
		})

		return {
			id: row.id,
			clientId: row.clientId,
			providerType: row.providerType,
			apiKeyMasked: maskApiKey(input.apiKey),
			model: row.model,
			embeddingModel: row.embeddingModel,
			baseUrl: row.baseUrl,
			updatedAt: row.updatedAt.toISOString(),
		}
	}

	async deleteConfig(clientId: string) {
		const deleted = await this.repo.deleteByClientId(clientId)
		if (!deleted) throw new NotFoundError("No provider config found")
	}

	async resolveForAi(
		clientId: string,
	): Promise<{ config: AiProviderConfig; isExternal: boolean }> {
		const row = await this.repo.getByClientId(clientId)
		if (row) {
			const parsed = upsertProviderConfigBodySchema.safeParse({
				providerType: row.providerType,
				apiKey: await decrypt(row.apiKeyEncrypted),
				model: row.model,
				baseUrl: row.baseUrl ?? undefined,
				embeddingModel: row.embeddingModel ?? undefined,
			})
			if (!parsed.success) {
				throw new BadRequestError(
					"PROVIDER_CONFIG_INVALID",
					`Invalid provider config: ${parsed.error.issues.map(({ path, message }) => `${path.join(".")}: ${message}`).join(", ")}`,
				)
			}
			return { config: parsed.data, isExternal: true }
		}
		const defaultConfig = getDefaultProviderConfig()
		if (!defaultConfig) {
			throw new BadRequestError(
				"PROVIDER_NOT_CONFIGURED",
				"No AI provider configured",
			)
		}
		return { config: defaultConfig, isExternal: false }
	}
}
