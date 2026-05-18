import type { EmbeddingModel } from "ai"
import { embed, embedMany } from "ai"
import type { AiProviderConfig } from "shared"
import { z } from "zod"
import { config, getDefaultProviderConfig } from "@/common/config"
import { decrypt } from "@/common/crypto"
import { BadRequestError } from "@/common/errors"
import type { FilesService } from "@/modules/files/files.service"
import type { ProviderConfigRepository } from "@/modules/provider-config/provider-config.repository"
import { chunkText } from "./rag.chunking"
import { createEmbeddingModel } from "./rag.embedding"
import type { RagRepository } from "./rag.repository"

const providerConfigSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("openai"),
		apiKey: z.string().min(1),
		model: z.string().min(1),
		baseURL: z.string().optional(),
		embeddingModel: z.string().optional(),
	}),
	z.object({
		type: z.literal("openai_compatible"),
		apiKey: z.string().min(1),
		model: z.string().min(1),
		baseURL: z.string().min(1),
		embeddingModel: z.string().optional(),
	}),
	z.object({
		type: z.literal("google"),
		apiKey: z.string().min(1),
		model: z.string().min(1),
		baseURL: z.string().optional(),
		embeddingModel: z.string().optional(),
	}),
	z.object({
		type: z.literal("anthropic"),
		apiKey: z.string().min(1),
		model: z.string().min(1),
		baseURL: z.string().optional(),
		embeddingModel: z.string().optional(),
	}),
])

const EMBEDDING_MODEL_RATES: Record<string, number> = {
	"text-embedding-3-small": 0.02 / 1_000_000,
	"text-embedding-3-large": 0.13 / 1_000_000,
	"text-embedding-ada-002": 0.1 / 1_000_000,
}

function getEmbeddingRateForModel(modelId: string): number {
	return EMBEDDING_MODEL_RATES[modelId] ?? 0.02 / 1_000_000
}

type ResolvedEmbedding =
	| { model: EmbeddingModel; modelId: string; usePlatformBilling: false }
	| {
			model: EmbeddingModel
			modelId: string
			usePlatformBilling: true
			platformRatePerToken: number
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

		if (resolved.usePlatformBilling && usage?.tokens) {
			const costUsd = usage.tokens * resolved.platformRatePerToken
			await this.repo.recordEmbeddingUsage({
				clientId,
				tokensUsed: usage.tokens,
				costUsd: costUsd.toFixed(6),
			})
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
		const { model } = this.resolveEmbeddingConfig(providerConfig)

		const { embedding } = await embed({ model, value: message })

		return this.repo.search(clientId, embedding, topK ?? 5)
	}

	private async resolveProviderConfig(
		clientId: string,
	): Promise<AiProviderConfig | null> {
		const row = await this.providerConfigRepo.getByClientId(clientId)
		if (!row) return null
		const parsed = providerConfigSchema.safeParse({
			type: row.providerType,
			apiKey: await decrypt(row.apiKeyEncrypted),
			model: row.model,
			baseURL: row.baseUrl ?? undefined,
			embeddingModel: row.embeddingModel ?? undefined,
		})
		if (!parsed.success) {
			throw new BadRequestError(
				"PROVIDER_CONFIG_INVALID",
				`Invalid provider config: ${parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
			)
		}
		return parsed.data
	}

	private resolveEmbeddingConfig(
		providerConfig: AiProviderConfig | null,
	): ResolvedEmbedding {
		if (
			providerConfig === null ||
			providerConfig.type === "anthropic" ||
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
				platformRatePerToken: getEmbeddingRateForModel(
					configWithModel.embeddingModel,
				),
			}
		}
		return {
			model: createEmbeddingModel(providerConfig),
			modelId: providerConfig.embeddingModel,
			usePlatformBilling: false,
		}
	}
}
