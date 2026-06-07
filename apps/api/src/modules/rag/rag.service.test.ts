import { beforeEach, describe, expect, it, mock } from "bun:test"
import type { AiProviderConfig } from "shared"
import { computeEmbeddingCostUsd } from "@/common/billing"
import { InMemoryRagRepository } from "./rag.repository"

// ─── Mock ai package BEFORE importing rag.service ─────────────────────────────

const mockEmbedMany = mock(
	async (
		_opts: unknown,
	): Promise<{ embeddings: number[][]; usage: { tokens: number } }> => {
		return {
			embeddings: [[0.1, 0.2, 0.3]],
			usage: { tokens: 42 },
		}
	},
)

const mockEmbed = mock(
	async (
		_opts: unknown,
	): Promise<{ embedding: number[]; usage: { tokens: number } }> => {
		return {
			embedding: [0.1, 0.2, 0.3],
			usage: { tokens: 10 },
		}
	},
)

mock.module("ai", () => ({
	embedMany: mockEmbedMany,
	embed: mockEmbed,
}))

// ─── Mock rag.embedding BEFORE importing rag.service ─────────────────────────

const mockEmbeddingModel = {
	specificationVersion: "v1",
	provider: "mock",
	modelId: "mock",
}

const mockCreateEmbeddingModel = mock(
	(_config: AiProviderConfig) => mockEmbeddingModel,
)

mock.module("./rag.embedding", () => ({
	createEmbeddingModel: mockCreateEmbeddingModel,
}))

// ─── Mock crypto BEFORE importing rag.service ────────────────────────────────
// decrypt returns the value as-is so test keys don't need real encryption

mock.module("@/common/crypto", () => ({
	decrypt: async (value: string) => value,
	encrypt: async (value: string) => value,
}))

// ─── Mock config BEFORE importing rag.service ────────────────────────────────

const defaultProviderConfig: AiProviderConfig = {
	providerType: "openai",
	apiKey: "default-key",
	model: "gpt-4",
}

mock.module("@/common/config", () => ({
	config: {
		JWT_SECRET: "test-secret-this-is-at-least-32-chars-long-for-hs256",
		JWT_EXPIRES_IN: "24h",
	},
	getDefaultProviderConfig: () => defaultProviderConfig,
}))

// ─── Now import the module under test ─────────────────────────────────────────

const { RagService } = await import("./rag.service")

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CLIENT_ID = "client-abc"
const FILE_PATH = "docs/readme.txt"

type FakeFilesService = {
	read: (key: string) => { text: () => Promise<string> }
}

function makeFakeFilesService(content: string): FakeFilesService {
	return {
		read: (_key: string) => ({
			text: async () => content,
		}),
	}
}

type FakeDbRow = {
	providerType: string
	apiKeyEncrypted: string
	model: string
	baseUrl?: string | null
	embeddingModel?: string | null
} | null

type FakeProviderConfigRepo = {
	getByClientId: (clientId: string) => Promise<FakeDbRow>
}

function makeDbRow(config: AiProviderConfig): FakeDbRow {
	return {
		providerType: config.providerType,
		apiKeyEncrypted: config.apiKey,
		model: config.model,
		baseUrl: "baseUrl" in config ? (config.baseUrl ?? null) : null,
		embeddingModel: config.embeddingModel ?? null,
	}
}

function makeFakeProviderConfigRepo(
	config: AiProviderConfig | null,
): FakeProviderConfigRepo {
	return {
		getByClientId: async (_clientId: string) =>
			config ? makeDbRow(config) : null,
	}
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("RagService", () => {
	let repo: InMemoryRagRepository
	let filesService: FakeFilesService
	let providerConfigRepo: FakeProviderConfigRepo

	beforeEach(() => {
		repo = new InMemoryRagRepository()
		repo.balances.set(CLIENT_ID, 100)
		filesService = makeFakeFilesService("Hello world, this is some content.")
		providerConfigRepo = makeFakeProviderConfigRepo(null)
		mockEmbedMany.mockClear()
		mockEmbed.mockClear()
		mockCreateEmbeddingModel.mockClear()
	})

	describe("indexFile", () => {
		it("chunks text, calls embedMany, and upserts chunks to repo", async () => {
			const openaiConfig: AiProviderConfig = {
				providerType: "openai",
				apiKey: "sk-test",
				model: "gpt-4",
			}
			providerConfigRepo = makeFakeProviderConfigRepo(openaiConfig)

			mockEmbedMany.mockImplementation(async () => ({
				embeddings: [[0.1, 0.2, 0.3]],
				usage: { tokens: 5 },
			}))

			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)

			await service.indexFile(CLIENT_ID, FILE_PATH)

			expect(mockEmbedMany).toHaveBeenCalledTimes(1)
			const chunks = await repo.search(CLIENT_ID, [0.1, 0.2, 0.3], 10)
			expect(chunks.length).toBeGreaterThan(0)
		})

		it("deletes existing chunks and skips embedding when file is empty", async () => {
			// First index a non-empty file so there's existing data
			const openaiConfig: AiProviderConfig = {
				providerType: "openai",
				apiKey: "sk-test",
				model: "gpt-4",
			}
			providerConfigRepo = makeFakeProviderConfigRepo(openaiConfig)
			mockEmbedMany.mockImplementation(async () => ({
				embeddings: [[0.1, 0.2, 0.3]],
				usage: { tokens: 5 },
			}))

			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)
			await service.indexFile(CLIENT_ID, FILE_PATH)
			expect(mockEmbedMany).toHaveBeenCalledTimes(1)

			// Now re-index with empty content
			filesService = makeFakeFilesService("")
			mockEmbedMany.mockClear()

			const service2 = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)
			await service2.indexFile(CLIENT_ID, FILE_PATH)

			// embedMany should NOT be called for empty file
			expect(mockEmbedMany).toHaveBeenCalledTimes(0)
			// Repo should have no chunks for this file
			const chunks = await repo.search(CLIENT_ID, [0.1, 0.2, 0.3], 10)
			expect(chunks.length).toBe(0)
		})

		it("records platform billing usage when provider is null (anthropic/default)", async () => {
			// null provider → platform billing
			providerConfigRepo = makeFakeProviderConfigRepo(null)
			mockEmbedMany.mockImplementation(async () => ({
				embeddings: [[0.1, 0.2, 0.3]],
				usage: { tokens: 100 },
			}))

			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)
			await service.indexFile(CLIENT_ID, FILE_PATH)

			expect(repo.usageRecords.length).toBe(1)
			expect(repo.usageRecords[0]?.clientId).toBe(CLIENT_ID)
			expect(repo.usageRecords[0]?.tokensUsed).toBe(100)
		})

		it("records platform billing usage when provider type is anthropic", async () => {
			const anthropicConfig: AiProviderConfig = {
				providerType: "anthropic",
				apiKey: "sk-ant",
				model: "claude-3",
			}
			providerConfigRepo = makeFakeProviderConfigRepo(anthropicConfig)
			mockEmbedMany.mockImplementation(async () => ({
				embeddings: [[0.1, 0.2, 0.3]],
				usage: { tokens: 50 },
			}))

			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)
			await service.indexFile(CLIENT_ID, FILE_PATH)

			expect(repo.usageRecords.length).toBe(1)
			expect(repo.usageRecords[0]?.tokensUsed).toBe(50)
		})

		it("does not record billing usage when provider has its own embeddingModel", async () => {
			const openaiConfig: AiProviderConfig = {
				providerType: "openai",
				apiKey: "sk-test",
				model: "gpt-4",
				embeddingModel: "text-embedding-3-small",
			}
			providerConfigRepo = makeFakeProviderConfigRepo(openaiConfig)
			mockEmbedMany.mockImplementation(async () => ({
				embeddings: [[0.1, 0.2, 0.3]],
				usage: { tokens: 20 },
			}))

			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)
			await service.indexFile(CLIENT_ID, FILE_PATH)

			expect(repo.usageRecords.length).toBe(0)
		})

		it("deducts client balance when recording platform billing usage", async () => {
			providerConfigRepo = makeFakeProviderConfigRepo(null)
			mockEmbedMany.mockImplementation(async () => ({
				embeddings: [[0.1, 0.2, 0.3]],
				usage: { tokens: 100 },
			}))

			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)
			await service.indexFile(CLIENT_ID, FILE_PATH)

			expect(repo.balanceDeductions.length).toBe(1)
			expect(repo.balanceDeductions[0]?.clientId).toBe(CLIENT_ID)
			expect(repo.balanceDeductions[0]?.amount).toBe(
				computeEmbeddingCostUsd(100),
			)
		})
	})

	describe("removeFile", () => {
		it("delegates to repo.deleteByFilePath", async () => {
			// Seed a chunk so we can verify deletion
			await repo.upsertChunks([
				{
					clientId: CLIENT_ID,
					filePath: FILE_PATH,
					chunkIndex: 0,
					chunkText: "some text",
					embedding: [0.1, 0.2, 0.3],
					embeddingDimensions: 3,
				},
			])

			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)
			await service.removeFile(CLIENT_ID, FILE_PATH)

			const chunks = await repo.search(CLIENT_ID, [0.1, 0.2, 0.3], 10)
			expect(chunks.length).toBe(0)
		})
	})

	describe("renameFile", () => {
		it("delegates to repo.renameFilePath", async () => {
			const oldPath = "docs/old.txt"
			const newPath = "docs/new.txt"

			await repo.upsertChunks([
				{
					clientId: CLIENT_ID,
					filePath: oldPath,
					chunkIndex: 0,
					chunkText: "content here",
					embedding: [0.5, 0.5, 0.5],
					embeddingDimensions: 3,
				},
			])

			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)
			await service.renameFile(CLIENT_ID, oldPath, newPath)

			// Searching should still find the chunk (by embedding similarity)
			const chunks = await repo.search(CLIENT_ID, [0.5, 0.5, 0.5], 10)
			expect(chunks.length).toBe(1)
			expect(chunks[0]).toBe("content here")
		})
	})

	describe("removeAllFiles", () => {
		it("delegates to repo.deleteByClientId", async () => {
			await repo.upsertChunks([
				{
					clientId: CLIENT_ID,
					filePath: "a.txt",
					chunkIndex: 0,
					chunkText: "chunk a",
					embedding: [1, 0, 0],
					embeddingDimensions: 3,
				},
				{
					clientId: CLIENT_ID,
					filePath: "b.txt",
					chunkIndex: 0,
					chunkText: "chunk b",
					embedding: [0, 1, 0],
					embeddingDimensions: 3,
				},
			])

			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)
			await service.removeAllFiles(CLIENT_ID)

			const chunks = await repo.search(CLIENT_ID, [1, 0, 0], 10)
			expect(chunks.length).toBe(0)
		})
	})

	describe("retrieve", () => {
		it("calls embed and repo.search, returns matching chunk texts", async () => {
			await repo.upsertChunks([
				{
					clientId: CLIENT_ID,
					filePath: FILE_PATH,
					chunkIndex: 0,
					chunkText: "the answer is 42",
					embedding: [0.9, 0.1, 0.0],
					embeddingDimensions: 3,
				},
			])

			mockEmbed.mockImplementation(async () => ({
				embedding: [0.9, 0.1, 0.0],
				usage: { tokens: 5 },
			}))

			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)
			const results = await service.retrieve(CLIENT_ID, "what is the answer?")

			expect(mockEmbed).toHaveBeenCalledTimes(1)
			expect(results).toContain("the answer is 42")
		})

		it("uses topK parameter when provided", async () => {
			await repo.upsertChunks([
				{
					clientId: CLIENT_ID,
					filePath: "f1.txt",
					chunkIndex: 0,
					chunkText: "chunk one",
					embedding: [1, 0, 0],
					embeddingDimensions: 3,
				},
				{
					clientId: CLIENT_ID,
					filePath: "f2.txt",
					chunkIndex: 0,
					chunkText: "chunk two",
					embedding: [0.9, 0.1, 0],
					embeddingDimensions: 3,
				},
				{
					clientId: CLIENT_ID,
					filePath: "f3.txt",
					chunkIndex: 0,
					chunkText: "chunk three",
					embedding: [0.8, 0.2, 0],
					embeddingDimensions: 3,
				},
			])

			mockEmbed.mockImplementation(async () => ({
				embedding: [1, 0, 0],
				usage: { tokens: 3 },
			}))

			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)
			const results = await service.retrieve(CLIENT_ID, "query", 2)

			expect(results.length).toBe(2)
		})

		it("records platform billing usage for query embedding when using platform provider", async () => {
			providerConfigRepo = makeFakeProviderConfigRepo(null)
			repo.balances.set(CLIENT_ID, 100)

			mockEmbed.mockImplementation(async () => ({
				embedding: [0.1, 0.2, 0.3],
				usage: { tokens: 5 },
			}))

			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)
			await service.retrieve(CLIENT_ID, "test query")

			expect(repo.usageRecords.length).toBe(1)
			expect(repo.usageRecords[0]?.tokensUsed).toBe(5)
			expect(repo.balanceDeductions.length).toBe(1)
			expect(repo.balanceDeductions[0]?.amount).toBe(computeEmbeddingCostUsd(5))
		})

		it("throws when platform billing is required but balance is insufficient", async () => {
			providerConfigRepo = makeFakeProviderConfigRepo(null)
			repo.balances.set(CLIENT_ID, computeEmbeddingCostUsd(5) - 1e-9)

			mockEmbed.mockImplementation(async () => ({
				embedding: [0.1, 0.2, 0.3],
				usage: { tokens: 5 },
			}))

			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)

			await expect(service.retrieve(CLIENT_ID, "test query")).rejects.toThrow(
				"Insufficient balance",
			)
			expect(repo.usageRecords.length).toBe(0)
			expect(repo.balanceDeductions.length).toBe(0)
		})

		it("does not record billing usage for query embedding when client has own embedding model", async () => {
			const openaiConfig: AiProviderConfig = {
				providerType: "openai",
				apiKey: "sk-test",
				model: "gpt-4",
				embeddingModel: "text-embedding-3-small",
			}
			providerConfigRepo = makeFakeProviderConfigRepo(openaiConfig)

			mockEmbed.mockImplementation(async () => ({
				embedding: [0.1, 0.2, 0.3],
				usage: { tokens: 5 },
			}))

			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)
			await service.retrieve(CLIENT_ID, "test query")

			expect(repo.usageRecords.length).toBe(0)
		})
	})
})
