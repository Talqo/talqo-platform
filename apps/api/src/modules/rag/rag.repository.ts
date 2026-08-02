import { and, eq, sql } from "drizzle-orm"
import { BadRequestError } from "@/common/errors"
import type { DB } from "@/db"
import {
	clients,
	fileEmbeddings,
	ragFileStatuses,
	usageRecords,
} from "@/db/schema"

export type RagFileStatus = "indexed" | "failed"
export type RagFileErrorCode = "insufficient_balance" | "provider_error"

export type RagFileStatusRecord = {
	filePath: string
	status: RagFileStatus
	errorCode: RagFileErrorCode | null
}

export type FileChunk = {
	chunkIndex: number
	chunkText: string
	embedding: number[]
	embeddingDimensions: number
}

export type UsageInsert = {
	clientId: string
	tokensUsed: number
	costUsd: number
}

export type RagRepository = {
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
	reserveEmbeddingUsage(usage: UsageInsert): Promise<string>
	refundEmbeddingUsage(clientId: string, usageId: string): Promise<void>
	listFileStatuses(clientId: string): Promise<RagFileStatusRecord[]>
	replaceFileChunks(
		clientId: string,
		filePath: string,
		chunks: FileChunk[],
	): Promise<void>
	markFileFailed(
		clientId: string,
		filePath: string,
		errorCode: RagFileErrorCode,
	): Promise<void>
	deleteFileData(clientId: string, filePath: string): Promise<void>
}

function toVectorLiteral(embedding: number[]): string {
	return `[${embedding.map(String).join(",")}]`
}

export class DrizzleRagRepository implements RagRepository {
	constructor(private readonly db: DB) {}

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
		await this.db.transaction(async (tx) => {
			await tx
				.update(fileEmbeddings)
				.set({ filePath: newPath })
				.where(
					and(
						eq(fileEmbeddings.clientId, clientId),
						eq(fileEmbeddings.filePath, oldPath),
					),
				)
			await tx
				.update(ragFileStatuses)
				.set({ filePath: newPath })
				.where(
					and(
						eq(ragFileStatuses.clientId, clientId),
						eq(ragFileStatuses.filePath, oldPath),
					),
				)
		})
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
		if (
			typeof usage.tokensUsed !== "number" ||
			typeof usage.costUsd !== "number" ||
			!Number.isFinite(usage.tokensUsed) ||
			!Number.isFinite(usage.costUsd) ||
			usage.tokensUsed < 0 ||
			usage.costUsd < 0
		) {
			throw new BadRequestError(
				"INVALID_USAGE",
				"tokensUsed and costUsd must be non-negative numbers",
			)
		}
		await this.db.transaction(async (tx) => {
			const [client] = await tx
				.select({ id: clients.id })
				.from(clients)
				.where(eq(clients.id, usage.clientId))
			if (!client) {
				throw new BadRequestError("CLIENT_NOT_FOUND", "Client not found")
			}
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
						sql`${clients.balanceUsd} >= ${usage.costUsd}`,
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

	async reserveEmbeddingUsage(usage: UsageInsert): Promise<string> {
		return this.db.transaction(async (tx) => {
			const updated = await tx
				.update(clients)
				.set({ balanceUsd: sql`${clients.balanceUsd} - ${usage.costUsd}` })
				.where(
					and(
						eq(clients.id, usage.clientId),
						sql`${clients.balanceUsd} >= ${usage.costUsd}`,
					),
				)
				.returning({ id: clients.id })
			if (updated.length === 0) {
				throw new BadRequestError(
					"BALANCE_INSUFFICIENT",
					"Insufficient balance",
				)
			}
			const [record] = await tx
				.insert(usageRecords)
				.values({
					clientId: usage.clientId,
					messageId: null,
					type: "embedding",
					tokensUsed: usage.tokensUsed,
					costUsd: usage.costUsd,
				})
				.returning({ id: usageRecords.id })
			if (!record) throw new Error("Failed to reserve embedding usage")
			return record.id
		})
	}

	async refundEmbeddingUsage(clientId: string, usageId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const [record] = await tx
				.delete(usageRecords)
				.where(
					and(
						eq(usageRecords.id, usageId),
						eq(usageRecords.clientId, clientId),
						eq(usageRecords.type, "embedding"),
					),
				)
				.returning({ costUsd: usageRecords.costUsd })
			if (record) {
				await tx
					.update(clients)
					.set({ balanceUsd: sql`${clients.balanceUsd} + ${record.costUsd}` })
					.where(eq(clients.id, clientId))
			}
		})
	}

	async listFileStatuses(clientId: string): Promise<RagFileStatusRecord[]> {
		const [statuses, embeddedFiles] = await Promise.all([
			this.db
				.select({
					filePath: ragFileStatuses.filePath,
					status: ragFileStatuses.status,
					errorCode: ragFileStatuses.errorCode,
				})
				.from(ragFileStatuses)
				.where(eq(ragFileStatuses.clientId, clientId)),
			this.db
				.selectDistinct({ filePath: fileEmbeddings.filePath })
				.from(fileEmbeddings)
				.where(eq(fileEmbeddings.clientId, clientId)),
		])
		const knownPaths = new Set(statuses.map((status) => status.filePath))
		return [
			...statuses,
			...embeddedFiles
				.filter(({ filePath }) => !knownPaths.has(filePath))
				.map(({ filePath }) => ({
					filePath,
					status: "indexed" as const,
					errorCode: null,
				})),
		]
	}

	async replaceFileChunks(
		clientId: string,
		filePath: string,
		chunks: FileChunk[],
	): Promise<void> {
		await this.db.transaction(async (tx) => {
			await tx
				.delete(fileEmbeddings)
				.where(
					and(
						eq(fileEmbeddings.clientId, clientId),
						eq(fileEmbeddings.filePath, filePath),
					),
				)
			if (chunks.length > 0) {
				await tx
					.insert(fileEmbeddings)
					.values(chunks.map((chunk) => ({ ...chunk, clientId, filePath })))
			}
			await tx
				.insert(ragFileStatuses)
				.values({ clientId, filePath, status: "indexed", errorCode: null })
				.onConflictDoUpdate({
					target: [ragFileStatuses.clientId, ragFileStatuses.filePath],
					set: { status: "indexed", errorCode: null },
				})
		})
	}

	async markFileFailed(
		clientId: string,
		filePath: string,
		errorCode: RagFileErrorCode,
	): Promise<void> {
		await this.db.transaction(async (tx) => {
			await tx
				.delete(fileEmbeddings)
				.where(
					and(
						eq(fileEmbeddings.clientId, clientId),
						eq(fileEmbeddings.filePath, filePath),
					),
				)
			await tx
				.insert(ragFileStatuses)
				.values({ clientId, filePath, status: "failed", errorCode })
				.onConflictDoUpdate({
					target: [ragFileStatuses.clientId, ragFileStatuses.filePath],
					set: { status: "failed", errorCode },
				})
		})
	}

	async deleteFileData(clientId: string, filePath: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			await tx
				.delete(ragFileStatuses)
				.where(
					and(
						eq(ragFileStatuses.clientId, clientId),
						eq(ragFileStatuses.filePath, filePath),
					),
				)
			await tx
				.delete(fileEmbeddings)
				.where(
					and(
						eq(fileEmbeddings.clientId, clientId),
						eq(fileEmbeddings.filePath, filePath),
					),
				)
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
	id: string
	clientId: string
	tokensUsed: number
	costUsd: number
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
	balanceDeductions: { clientId: string; amount: number }[] = []
	balances: Map<string, number> = new Map()
	fileStatuses: Map<string, RagFileStatusRecord> = new Map()

	private chunkKey(
		clientId: string,
		filePath: string,
		chunkIndex: number,
	): string {
		return `${clientId}::${filePath}::${chunkIndex}`
	}

	async seedChunks(chunks: StoredChunk[]): Promise<void> {
		for (const chunk of chunks) {
			const key = this.chunkKey(
				chunk.clientId,
				chunk.filePath,
				chunk.chunkIndex,
			)
			this.chunks.set(key, { ...chunk })
		}
	}

	private deleteChunks(clientId: string, filePath: string): void {
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
		const status = this.fileStatuses.get(`${clientId}::${oldPath}`)
		if (status) {
			this.fileStatuses.delete(`${clientId}::${oldPath}`)
			this.fileStatuses.set(`${clientId}::${newPath}`, {
				...status,
				filePath: newPath,
			})
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
		if (
			typeof usage.tokensUsed !== "number" ||
			typeof usage.costUsd !== "number" ||
			!Number.isFinite(usage.tokensUsed) ||
			!Number.isFinite(usage.costUsd) ||
			usage.tokensUsed < 0 ||
			usage.costUsd < 0
		) {
			throw new BadRequestError(
				"INVALID_USAGE",
				"tokensUsed and costUsd must be non-negative numbers",
			)
		}
		if (!this.balances.has(usage.clientId)) {
			throw new BadRequestError("CLIENT_NOT_FOUND", "Client not found")
		}
		const currentBalance = this.balances.get(usage.clientId) ?? 0
		if (currentBalance < usage.costUsd) {
			throw new BadRequestError("BALANCE_INSUFFICIENT", "Insufficient balance")
		}
		this.usageRecords.push({ id: crypto.randomUUID(), ...usage })
		this.balanceDeductions.push({
			clientId: usage.clientId,
			amount: usage.costUsd,
		})
		this.balances.set(usage.clientId, currentBalance - usage.costUsd)
	}

	async reserveEmbeddingUsage(usage: UsageInsert): Promise<string> {
		if (!this.balances.has(usage.clientId)) {
			throw new BadRequestError("CLIENT_NOT_FOUND", "Client not found")
		}
		const balance = this.balances.get(usage.clientId) ?? 0
		if (balance < usage.costUsd) {
			throw new BadRequestError("BALANCE_INSUFFICIENT", "Insufficient balance")
		}
		const id = crypto.randomUUID()
		this.balances.set(usage.clientId, balance - usage.costUsd)
		this.balanceDeductions.push({
			clientId: usage.clientId,
			amount: usage.costUsd,
		})
		this.usageRecords.push({ id, ...usage })
		return id
	}

	async refundEmbeddingUsage(clientId: string, usageId: string): Promise<void> {
		const index = this.usageRecords.findIndex(
			(record) => record.id === usageId && record.clientId === clientId,
		)
		if (index === -1) return
		const [record] = this.usageRecords.splice(index, 1)
		if (record) {
			this.balances.set(
				clientId,
				(this.balances.get(clientId) ?? 0) + record.costUsd,
			)
		}
	}

	async listFileStatuses(clientId: string): Promise<RagFileStatusRecord[]> {
		const statuses = [...this.fileStatuses.entries()]
			.filter(([key]) => key.startsWith(`${clientId}::`))
			.map(([, status]) => status)
		const knownPaths = new Set(statuses.map((status) => status.filePath))
		const embeddedPaths = new Set(
			[...this.chunks.values()]
				.filter((chunk) => chunk.clientId === clientId)
				.map((chunk) => chunk.filePath),
		)
		return [
			...statuses,
			...[...embeddedPaths]
				.filter((filePath) => !knownPaths.has(filePath))
				.map((filePath) => ({
					filePath,
					status: "indexed" as const,
					errorCode: null,
				})),
		]
	}

	async replaceFileChunks(
		clientId: string,
		filePath: string,
		chunks: FileChunk[],
	): Promise<void> {
		const key = `${clientId}::${filePath}`
		this.deleteChunks(clientId, filePath)
		for (const chunk of chunks) {
			this.chunks.set(this.chunkKey(clientId, filePath, chunk.chunkIndex), {
				...chunk,
				clientId,
				filePath,
			})
		}
		this.fileStatuses.set(key, {
			filePath,
			status: "indexed",
			errorCode: null,
		})
	}

	async markFileFailed(
		clientId: string,
		filePath: string,
		errorCode: RagFileErrorCode,
	): Promise<void> {
		const key = `${clientId}::${filePath}`
		this.deleteChunks(clientId, filePath)
		this.fileStatuses.set(key, {
			filePath,
			status: "failed",
			errorCode,
		})
	}

	async deleteFileData(clientId: string, filePath: string): Promise<void> {
		this.deleteChunks(clientId, filePath)
		this.fileStatuses.delete(`${clientId}::${filePath}`)
	}
}
