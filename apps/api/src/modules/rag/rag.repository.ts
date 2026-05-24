import { and, eq, sql } from "drizzle-orm"
import { BadRequestError } from "@/common/errors"
import type { DB } from "@/db"
import { clients, fileEmbeddings, usageRecords } from "@/db/schema"

export type UpsertChunk = {
	clientId: string
	filePath: string
	chunkIndex: number
	chunkText: string
	embedding: number[]
	embeddingDimensions: number
}

export type UsageInsert = {
	clientId: string
	tokensUsed: number
	costUsd: string
}

export type RagRepository = {
	upsertChunks(chunks: UpsertChunk[]): Promise<void>
	deleteByFilePath(clientId: string, filePath: string): Promise<void>
	deleteByClientId(clientId: string): Promise<void>
	renameFilePath(
		clientId: string,
		oldPath: string,
		newPath: string,
	): Promise<void>
	search(
		clientId: string,
		queryEmbedding: number[],
		topK: number,
	): Promise<string[]>
	recordEmbeddingUsage(usage: UsageInsert): Promise<void>
}

function toVectorLiteral(embedding: number[]): string {
	return `[${embedding.map(String).join(",")}]`
}

export class DrizzleRagRepository implements RagRepository {
	constructor(private readonly db: DB) {}

	async upsertChunks(chunks: UpsertChunk[]): Promise<void> {
		if (chunks.length === 0) return

		const values = chunks.map((chunk) => ({
			clientId: chunk.clientId,
			filePath: chunk.filePath,
			chunkIndex: chunk.chunkIndex,
			chunkText: chunk.chunkText,
			embedding: chunk.embedding,
			embeddingDimensions: chunk.embeddingDimensions,
		}))

		await this.db
			.insert(fileEmbeddings)
			.values(values)
			.onConflictDoUpdate({
				target: [
					fileEmbeddings.clientId,
					fileEmbeddings.filePath,
					fileEmbeddings.chunkIndex,
				],
				set: {
					chunkText: sql`excluded.chunk_text`,
					// excluded.embedding is already the vector value from the inserted row
					embedding: sql`excluded.embedding`,
					embeddingDimensions: sql`excluded.embedding_dimensions`,
				},
			})
	}

	async deleteByFilePath(clientId: string, filePath: string): Promise<void> {
		await this.db
			.delete(fileEmbeddings)
			.where(
				and(
					eq(fileEmbeddings.clientId, clientId),
					eq(fileEmbeddings.filePath, filePath),
				),
			)
	}

	async deleteByClientId(clientId: string): Promise<void> {
		await this.db
			.delete(fileEmbeddings)
			.where(eq(fileEmbeddings.clientId, clientId))
	}

	async renameFilePath(
		clientId: string,
		oldPath: string,
		newPath: string,
	): Promise<void> {
		await this.db
			.update(fileEmbeddings)
			.set({ filePath: newPath })
			.where(
				and(
					eq(fileEmbeddings.clientId, clientId),
					eq(fileEmbeddings.filePath, oldPath),
				),
			)
	}

	async search(
		clientId: string,
		queryEmbedding: number[],
		topK: number,
	): Promise<string[]> {
		const vectorLiteral = toVectorLiteral(queryEmbedding)
		const rows = await this.db
			.select({ chunkText: fileEmbeddings.chunkText })
			.from(fileEmbeddings)
			.where(eq(fileEmbeddings.clientId, clientId))
			.orderBy(sql`${fileEmbeddings.embedding} <=> ${vectorLiteral}::vector`)
			.limit(topK)
		return rows.map((r) => r.chunkText)
	}

	async recordEmbeddingUsage(usage: UsageInsert): Promise<void> {
		await this.db.transaction(async (tx) => {
			await tx.insert(usageRecords).values({
				clientId: usage.clientId,
				messageId: null,
				type: "embedding",
				tokensUsed: usage.tokensUsed,
				costUsd: usage.costUsd,
			})
			const updated = await tx
				.update(clients)
				.set({
					balanceUsd: sql`${clients.balanceUsd} - ${usage.costUsd}`,
				})
				.where(
					and(
						eq(clients.id, usage.clientId),
						sql`${clients.balanceUsd} >= ${usage.costUsd}::numeric`,
					),
				)
				.returning({ id: clients.id })
			if (updated.length === 0) {
				throw new BadRequestError(
					"BALANCE_INSUFFICIENT",
					"Insufficient balance",
				)
			}
		})
	}
}

type StoredChunk = {
	clientId: string
	filePath: string
	chunkIndex: number
	chunkText: string
	embedding: number[]
	embeddingDimensions: number
}

type StoredUsage = {
	clientId: string
	tokensUsed: number
	costUsd: string
}

function cosineSimilarity(a: number[], b: number[]): number {
	const dot = a.reduce((sum, ai, i) => sum + ai * (b[i] ?? 0), 0)
	const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0))
	const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0))
	if (magA === 0 || magB === 0) return 0
	return dot / (magA * magB)
}

export class InMemoryRagRepository implements RagRepository {
	private chunks: Map<string, StoredChunk> = new Map()
	usageRecords: StoredUsage[] = []
	balanceDeductions: { clientId: string; amount: string }[] = []
	balances: Map<string, string> = new Map()

	private chunkKey(
		clientId: string,
		filePath: string,
		chunkIndex: number,
	): string {
		return `${clientId}::${filePath}::${chunkIndex}`
	}

	async upsertChunks(chunks: UpsertChunk[]): Promise<void> {
		for (const chunk of chunks) {
			const key = this.chunkKey(
				chunk.clientId,
				chunk.filePath,
				chunk.chunkIndex,
			)
			this.chunks.set(key, { ...chunk })
		}
	}

	async deleteByFilePath(clientId: string, filePath: string): Promise<void> {
		for (const [key, chunk] of this.chunks) {
			if (chunk.clientId === clientId && chunk.filePath === filePath) {
				this.chunks.delete(key)
			}
		}
	}

	async deleteByClientId(clientId: string): Promise<void> {
		for (const [key, chunk] of this.chunks) {
			if (chunk.clientId === clientId) {
				this.chunks.delete(key)
			}
		}
	}

	async renameFilePath(
		clientId: string,
		oldPath: string,
		newPath: string,
	): Promise<void> {
		const toRename: StoredChunk[] = []
		for (const [key, chunk] of this.chunks) {
			if (chunk.clientId === clientId && chunk.filePath === oldPath) {
				this.chunks.delete(key)
				toRename.push(chunk)
			}
		}
		for (const chunk of toRename) {
			const updated = { ...chunk, filePath: newPath }
			const key = this.chunkKey(clientId, newPath, chunk.chunkIndex)
			this.chunks.set(key, updated)
		}
	}

	async search(
		clientId: string,
		queryEmbedding: number[],
		topK: number,
	): Promise<string[]> {
		const candidates: { chunkText: string; score: number }[] = []
		for (const chunk of this.chunks.values()) {
			if (chunk.clientId !== clientId) continue
			const score = cosineSimilarity(queryEmbedding, chunk.embedding)
			candidates.push({ chunkText: chunk.chunkText, score })
		}
		candidates.sort((a, b) => b.score - a.score)
		return candidates.slice(0, topK).map((c) => c.chunkText)
	}

	async recordEmbeddingUsage(usage: UsageInsert): Promise<void> {
		const currentBalance = parseFloat(this.balances.get(usage.clientId) ?? "0")
		const cost = parseFloat(usage.costUsd)
		if (currentBalance < cost) {
			throw new BadRequestError("BALANCE_INSUFFICIENT", "Insufficient balance")
		}
		this.usageRecords.push({ ...usage })
		this.balanceDeductions.push({
			clientId: usage.clientId,
			amount: usage.costUsd,
		})
		this.balances.set(usage.clientId, (currentBalance - cost).toFixed(6))
	}
}
