import { beforeEach, describe, expect, it, mock } from "bun:test"
import type { AiProviderConfig } from "shared"
import { computeEmbeddingCostUsd } from "@/common/billing"
import { InMemoryRagRepository } from "./rag.repository.in-memory"

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
		// mock.module leaks across test files — keep this shape complete
		APP_URL: "http://localhost:3000",
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
			expect(mockEmbedMany.mock.calls[0]?.[0].abortSignal).toBeInstanceOf(
				AbortSignal,
			)
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
			expect(repo.balances.get(CLIENT_ID)).toBe(
				100 - computeEmbeddingCostUsd(100),
			)
		})

		it("records actual usage when it exceeds the reserved estimate", async () => {
			const estimatedCost = computeEmbeddingCostUsd(9)
			repo.balances.set(CLIENT_ID, estimatedCost)
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

			expect(repo.usageRecords[0]?.tokensUsed).toBe(100)
			expect(repo.balances.get(CLIENT_ID)).toBeLessThan(0)
		})

		it("does not call the provider when platform balance is insufficient", async () => {
			repo.balances.set(CLIENT_ID, 0)
			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)

			await expect(
				service.indexFile(CLIENT_ID, FILE_PATH),
			).rejects.toMatchObject({
				code: "BALANCE_INSUFFICIENT",
			})

			expect(mockEmbedMany).toHaveBeenCalledTimes(0)
			expect(
				(await repo.listFileStatuses(CLIENT_ID)).find(
					(status) => status.filePath === FILE_PATH,
				),
			).toMatchObject({
				status: "failed",
				errorCode: "insufficient_balance",
			})
		})

		it("persists provider failures without charging or deleting old chunks", async () => {
			const initialBalance = repo.balances.get(CLIENT_ID)
			await repo.seedChunks([
				{
					clientId: CLIENT_ID,
					filePath: FILE_PATH,
					chunkIndex: 0,
					chunkText: "previously indexed",
					embedding: [0.1, 0.2, 0.3],
					embeddingDimensions: 3,
				},
			])
			mockEmbedMany.mockImplementationOnce(async () => {
				throw new Error("provider unavailable")
			})
			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)

			await expect(service.indexFile(CLIENT_ID, FILE_PATH)).rejects.toThrow(
				"Embedding provider request failed",
			)

			expect(
				(await repo.listFileStatuses(CLIENT_ID)).find(
					(status) => status.filePath === FILE_PATH,
				),
			).toMatchObject({
				status: "stale",
				errorCode: "provider_error",
			})
			expect(repo.balances.get(CLIENT_ID)).toBe(initialBalance)
			expect(repo.usageRecords).toHaveLength(0)
			expect(await repo.search(CLIENT_ID, [0.1, 0.2, 0.3], 10)).toEqual([
				"previously indexed",
			])
		})

		it("serializes file embedding requests", async () => {
			let calls = 0
			let releaseFirst: () => void = () => {}
			const firstCallBlocked = new Promise<void>((resolve) => {
				releaseFirst = resolve
			})
			mockEmbedMany.mockImplementation(async () => {
				calls++
				if (calls === 1) await firstCallBlocked
				return {
					embeddings: [[0.1, 0.2, 0.3]],
					usage: { tokens: 5 },
				}
			})
			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)

			const first = service.indexFile(CLIENT_ID, "first.txt")
			await Bun.sleep(0)
			const second = service.indexFile(CLIENT_ID, "second.txt")
			await Bun.sleep(0)
			const callsBeforeRelease = calls
			releaseFirst()
			await Promise.all([first, second])

			expect(callsBeforeRelease).toBe(1)
			expect(calls).toBe(2)
		})

		it("serializes platform embedding requests across clients", async () => {
			const otherClientId = "00000000-0000-4000-8000-000000000002"
			repo.balances.set(otherClientId, 10)
			let calls = 0
			let releaseFirst: () => void = () => {}
			const firstCallBlocked = new Promise<void>((resolve) => {
				releaseFirst = resolve
			})
			mockEmbedMany.mockImplementation(async () => {
				calls++
				if (calls === 1) await firstCallBlocked
				return {
					embeddings: [[0.1, 0.2, 0.3]],
					usage: { tokens: 5 },
				}
			})
			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)

			const first = service.indexFile(CLIENT_ID, "first.txt")
			await Bun.sleep(0)
			const second = service.indexFile(otherClientId, "second.txt")
			await Bun.sleep(0)
			const callsBeforeRelease = calls
			releaseFirst()
			await Promise.all([first, second])

			expect(callsBeforeRelease).toBe(1)
		})

		it("does not serialize client-owned providers across clients", async () => {
			const otherClientId = "00000000-0000-4000-8000-000000000002"
			repo.balances.set(otherClientId, 10)
			const ownProvider: AiProviderConfig = {
				providerType: "openai",
				apiKey: "own-key",
				model: "gpt-4",
				embeddingModel: "text-embedding-3-small",
			}
			providerConfigRepo = makeFakeProviderConfigRepo(ownProvider)
			let calls = 0
			let releaseFirst: () => void = () => {}
			const firstCallBlocked = new Promise<void>((resolve) => {
				releaseFirst = resolve
			})
			mockEmbedMany.mockImplementation(async () => {
				calls++
				if (calls === 1) await firstCallBlocked
				return {
					embeddings: [[0.1, 0.2, 0.3]],
					usage: { tokens: 5 },
				}
			})
			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)

			const first = service.indexFile(CLIENT_ID, "first.txt")
			await Bun.sleep(0)
			const second = service.indexFile(otherClientId, "second.txt")
			await Bun.sleep(0)
			const callsBeforeRelease = calls
			releaseFirst()
			await Promise.all([first, second])

			expect(callsBeforeRelease).toBe(2)
		})

		it("does not block unrelated file operations behind embedding", async () => {
			let releaseProvider: () => void = () => {}
			const providerBlocked = new Promise<void>((resolve) => {
				releaseProvider = resolve
			})
			mockEmbedMany.mockImplementationOnce(async () => {
				await providerBlocked
				return {
					embeddings: [[0.1, 0.2, 0.3]],
					usage: { tokens: 5 },
				}
			})
			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)
			let uploadFinished = false

			const indexing = service.indexFile(CLIENT_ID, "first.txt")
			await Bun.sleep(0)
			const upload = service.runFileOperation(
				CLIENT_ID,
				"second.txt",
				async () => {
					uploadFinished = true
				},
			)
			await Bun.sleep(0)
			const finishedBeforeEmbedding = uploadFinished
			releaseProvider()
			await Promise.all([indexing, upload])

			expect(finishedBeforeEmbedding).toBe(true)
		})

		it("classifies file read failures as indexing errors", async () => {
			const failingFilesService = {
				...filesService,
				read: () => {
					throw new Error("storage unavailable")
				},
			}
			const service = new RagService(
				repo,
				failingFilesService as never,
				providerConfigRepo as never,
			)

			await expect(service.indexFile(CLIENT_ID, FILE_PATH)).rejects.toThrow(
				"storage unavailable",
			)
			expect(
				(await repo.listFileStatuses(CLIENT_ID)).find(
					(status) => status.filePath === FILE_PATH,
				),
			).toMatchObject({ status: "failed", errorCode: "indexing_error" })
		})

		it("rate limits repeated attempts for the same file", async () => {
			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)

			await service.indexFile(CLIENT_ID, FILE_PATH)
			await service.indexFile(CLIENT_ID, FILE_PATH)
			await service.indexFile(CLIENT_ID, FILE_PATH)

			await expect(
				service.indexFile(CLIENT_ID, FILE_PATH),
			).rejects.toMatchObject({
				code: "TOO_MANY_REQUESTS",
			})
		})

		it("clears the rate limit when a file is deleted", async () => {
			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)
			await service.indexFile(CLIENT_ID, FILE_PATH)
			await service.indexFile(CLIENT_ID, FILE_PATH)
			await service.indexFile(CLIENT_ID, FILE_PATH)

			await service.removeFile(CLIENT_ID, FILE_PATH)

			await expect(
				service.indexFile(CLIENT_ID, FILE_PATH),
			).resolves.toBeUndefined()
		})

		it("moves the rate limit when a file is renamed", async () => {
			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)
			await service.indexFile(CLIENT_ID, FILE_PATH)
			await service.indexFile(CLIENT_ID, FILE_PATH)
			await service.indexFile(CLIENT_ID, FILE_PATH)

			await service.renameFile(CLIENT_ID, FILE_PATH, "renamed.txt")

			await expect(
				service.indexFile(CLIENT_ID, "renamed.txt"),
			).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" })
		})

		it("finishes an in-flight index before deleting its data", async () => {
			let releaseProvider: () => void = () => {}
			const providerBlocked = new Promise<void>((resolve) => {
				releaseProvider = resolve
			})
			mockEmbedMany.mockImplementationOnce(async () => {
				await providerBlocked
				return {
					embeddings: [[0.1, 0.2, 0.3]],
					usage: { tokens: 5 },
				}
			})
			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)

			const indexing = service.indexFile(CLIENT_ID, FILE_PATH)
			await Bun.sleep(0)
			const deleting = service.removeFile(CLIENT_ID, FILE_PATH)
			releaseProvider()
			await Promise.all([indexing, deleting])

			expect(await repo.search(CLIENT_ID, [0.1, 0.2, 0.3], 10)).toHaveLength(0)
			expect(await repo.listFileStatuses(CLIENT_ID)).toHaveLength(0)
		})

		it("finishes an in-flight index before renaming its data", async () => {
			let releaseProvider: () => void = () => {}
			const providerBlocked = new Promise<void>((resolve) => {
				releaseProvider = resolve
			})
			mockEmbedMany.mockImplementationOnce(async () => {
				await providerBlocked
				return {
					embeddings: [[0.1, 0.2, 0.3]],
					usage: { tokens: 5 },
				}
			})
			const service = new RagService(
				repo,
				filesService as never,
				providerConfigRepo as never,
			)

			const indexing = service.indexFile(CLIENT_ID, FILE_PATH)
			await Bun.sleep(0)
			const renaming = service.renameFile(CLIENT_ID, FILE_PATH, "renamed.txt")
			releaseProvider()
			await Promise.all([indexing, renaming])

			expect(await repo.listFileStatuses(CLIENT_ID)).toEqual([
				{ filePath: "renamed.txt", status: "indexed", errorCode: null },
			])
		})
	})

	describe("removeFile", () => {
		it("removes the file chunks", async () => {
			// Seed a chunk so we can verify deletion
			await repo.seedChunks([
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

			await repo.seedChunks([
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
			repo.fileStatuses.set(`${CLIENT_ID}::a.txt`, {
				filePath: "a.txt",
				status: "indexed",
				errorCode: null,
			})
			await repo.seedChunks([
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
			expect(await repo.listFileStatuses(CLIENT_ID)).toHaveLength(0)
		})
	})

	describe("retrieve", () => {
		it("calls embed and repo.search, returns matching chunk texts", async () => {
			await repo.seedChunks([
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
			await repo.seedChunks([
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
