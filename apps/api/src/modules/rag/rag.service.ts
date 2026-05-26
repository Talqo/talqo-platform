import type { EmbeddingModel } from "ai"
import { embed, embedMany } from "ai"
import type { AiProviderConfig } from "shared"
import { upsertProviderConfigBodySchema } from "shared"
import { computeEmbeddingCostUsd, estimateTokens } from "@/common/billing"
import { config, getDefaultProviderConfig } from "@/common/config"
import { decrypt } from "@/common/crypto"
import { BadRequestError } from "@/common/errors"
import type { FilesService } from "@/modules/files/files.service"
import type { ProviderConfigRepository } from "@/modules/provider-config/provider-config.repository"
import { chunkText } from "./rag.chunking"
import { createEmbeddingModel } from "./rag.embedding"
import type { RagRepository } from "./rag.repository"

type ResolvedEmbedding = {
	model: EmbeddingModel
	modelId: string
	usePlatformBilling: boolean
}

export class RagService {
	constructor(
		private readonly repo: RagRepository,
		private readonly filesService: FilesService,
		private readonly providerConfigRepo: ProviderConfigRepository,
	) {}

	async indexFile(clientId: string, filePath: string): Promise<void> {
		const key = `${clientId}/${filePath}`
		const text = await this.filesService.read(key).text()

		const chunks = chunkText(text)

		if (chunks.length === 0) {
			await this.repo.deleteByFilePath(clientId, filePath)
			return
		}

		const providerConfig = await this.resolveProviderConfig(clientId)
		const resolved = this.resolveEmbeddingConfig(providerConfig)

		const { embeddings, usage } = await embedMany({
			model: resolved.model,
			values: chunks.map((c) => c.text),
		})

		if (embeddings.length !== chunks.length) {
			throw new Error(
				`Embedding count mismatch: expected ${chunks.length}, got ${embeddings.length} (model=${resolved.modelId}, clientId=${clientId}, filePath=${filePath})`,
			)
		}

		const upsertData = chunks.map((chunk, i) => {
			const embedding = embeddings[i]
			if (!embedding) {
				throw new Error(`Embedding missing at index ${i} for ${filePath}`)
			}
			return {
				clientId,
				filePath,
				chunkIndex: chunk.index,
				chunkText: chunk.text,
				embedding,
				embeddingDimensions: embedding.length,
			}
		})

		await this.repo.upsertChunks(upsertData)

		if (resolved.usePlatformBilling) {
			// Fall back to estimating tokens from the raw chunk text when the
			// provider doesn't report usage.
			const tokens =
				usage?.tokens && usage.tokens > 0
					? usage.tokens
					: chunks.reduce((acc, c) => acc + estimateTokens(c.text), 0)
			if (tokens > 0) {
				await this.repo.recordEmbeddingUsage({
					clientId,
					tokensUsed: tokens,
					costUsd: computeEmbeddingCostUsd(tokens),
				})
			}
		}
	}

	async removeFile(clientId: string, filePath: string): Promise<void> {
		await this.repo.deleteByFilePath(clientId, filePath)
	}

	async renameFile(
		clientId: string,
		oldPath: string,
		newPath: string,
	): Promise<void> {
		await this.repo.renameFilePath(clientId, oldPath, newPath)
	}

	async removeAllFiles(clientId: string): Promise<void> {
		await this.repo.deleteByClientId(clientId)
	}

	async retrieve(
		clientId: string,
		message: string,
		topK?: number,
	): Promise<string[]> {
		if (message.trim().length === 0) return []

		const providerConfig = await this.resolveProviderConfig(clientId)
		const resolved = this.resolveEmbeddingConfig(providerConfig)

		const { embedding, usage } = await embed({
			model: resolved.model,
			value: message,
		})

		if (resolved.usePlatformBilling) {
			const tokens =
				usage?.tokens && usage.tokens > 0
					? usage.tokens
					: estimateTokens(message)
			if (tokens > 0) {
				await this.repo.recordEmbeddingUsage({
					clientId,
					tokensUsed: tokens,
					costUsd: computeEmbeddingCostUsd(tokens),
				})
			}
		}

		return this.repo.search(clientId, embedding, topK ?? 5)
	}

	private async resolveProviderConfig(
		clientId: string,
	): Promise<AiProviderConfig | null> {
		const row = await this.providerConfigRepo.getByClientId(clientId)
		if (!row) return null
		let apiKey: string
		try {
			apiKey = await decrypt(row.apiKeyEncrypted)
		} catch {
			throw new BadRequestError(
				"PROVIDER_KEY_DECRYPT_FAILED",
				"Failed to decrypt provider API key",
			)
		}
		const parsed = upsertProviderConfigBodySchema.safeParse({
			providerType: row.providerType,
			apiKey,
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
		return parsed.data
	}

	private resolveEmbeddingConfig(
		providerConfig: AiProviderConfig | null,
	): ResolvedEmbedding {
		if (
			providerConfig === null ||
			providerConfig.providerType === "anthropic" ||
			!providerConfig.embeddingModel
		) {
			const defaultConfig = getDefaultProviderConfig()
			if (!defaultConfig) throw new Error("No embedding provider available")
			const fallbackModelId =
				config.DEFAULT_EMBEDDING_MODEL ?? "text-embedding-3-small"
			const configWithModel = {
				...defaultConfig,
				embeddingModel: defaultConfig.embeddingModel || fallbackModelId,
			}
			return {
				model: createEmbeddingModel(configWithModel),
				modelId: configWithModel.embeddingModel,
				usePlatformBilling: true,
			}
		}
		return {
			model: createEmbeddingModel(providerConfig),
			modelId: providerConfig.embeddingModel,
			usePlatformBilling: false,
		}
	}
}
