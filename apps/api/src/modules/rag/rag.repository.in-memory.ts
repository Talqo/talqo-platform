import type { RagFileErrorCode } from "shared"
import { BadRequestError, TooManyRequestsError } from "@/common/errors"
import type {
	FileChunk,
	RagFileStatusRecord,
	RagRepository,
	UsageInsert,
} from "./rag.repository"
import { validateUsage } from "./rag.repository"

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

type StoredReservation = StoredUsage & { expiresAt: number }

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
	private reservations = new Map<string, StoredReservation>()
	private rateLimits = new Map<
		string,
		{ attempts: number; startedAt: number }
	>()

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
		for (const key of this.fileStatuses.keys()) {
			if (key.startsWith(`${clientId}::`)) this.fileStatuses.delete(key)
		}
		for (const key of this.rateLimits.keys()) {
			if (key.startsWith(`${clientId}::`)) this.rateLimits.delete(key)
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
		const oldRateKey = `${clientId}::${oldPath}`
		const rateLimit = this.rateLimits.get(oldRateKey)
		this.rateLimits.delete(`${clientId}::${newPath}`)
		if (rateLimit) {
			this.rateLimits.delete(oldRateKey)
			this.rateLimits.set(`${clientId}::${newPath}`, rateLimit)
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
		validateUsage(usage)
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

	async consumeFileIndexAttempt(
		clientId: string,
		filePath: string,
	): Promise<void> {
		const key = `${clientId}::${filePath}`
		const now = Date.now()
		const window = this.rateLimits.get(key)
		if (!window || now - window.startedAt >= 60_000) {
			this.rateLimits.set(key, { attempts: 1, startedAt: now })
			return
		}
		window.attempts++
		if (window.attempts > 3) {
			throw new TooManyRequestsError("Too many reindex attempts")
		}
	}

	async reserveEmbeddingUsage(usage: UsageInsert): Promise<string> {
		validateUsage(usage)
		const now = Date.now()
		for (const [id, reservation] of this.reservations) {
			if (
				reservation.clientId === usage.clientId &&
				reservation.expiresAt < now
			) {
				this.reservations.delete(id)
				this.balances.set(
					usage.clientId,
					(this.balances.get(usage.clientId) ?? 0) + reservation.costUsd,
				)
			}
		}
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
		this.reservations.set(id, {
			id,
			...usage,
			expiresAt: now + 10 * 60_000,
		})
		return id
	}

	async refundEmbeddingUsage(
		clientId: string,
		reservationId: string,
	): Promise<void> {
		const reservation = this.reservations.get(reservationId)
		if (!reservation || reservation.clientId !== clientId) return
		this.reservations.delete(reservationId)
		this.balances.set(
			clientId,
			(this.balances.get(clientId) ?? 0) + reservation.costUsd,
		)
	}

	async refundExpiredEmbeddingUsage(): Promise<void> {
		const now = Date.now()
		for (const [id, reservation] of this.reservations) {
			if (reservation.expiresAt >= now) continue
			this.reservations.delete(id)
			this.balances.set(
				reservation.clientId,
				(this.balances.get(reservation.clientId) ?? 0) + reservation.costUsd,
			)
		}
	}

	async withLock<T>(_key: string, operation: () => Promise<T>): Promise<T> {
		return operation()
	}

	async listFileStatuses(clientId: string): Promise<RagFileStatusRecord[]> {
		return [...this.fileStatuses.entries()]
			.filter(([key]) => key.startsWith(`${clientId}::`))
			.map(([, status]) => status)
	}

	async replaceFileChunks(
		clientId: string,
		filePath: string,
		chunks: FileChunk[],
		reservationId?: string,
		finalUsage?: Omit<UsageInsert, "clientId">,
	): Promise<void> {
		const key = `${clientId}::${filePath}`
		if (reservationId) {
			const reservation = this.reservations.get(reservationId)
			if (!reservation || reservation.clientId !== clientId) {
				throw new Error("Embedding reservation not found")
			}
			const usage = finalUsage ?? reservation
			validateUsage({ clientId, ...usage })
			const costDifference = usage.costUsd - reservation.costUsd
			const balance = this.balances.get(clientId) ?? 0
			this.reservations.delete(reservationId)
			this.balances.set(clientId, balance - costDifference)
			this.usageRecords.push({
				id: crypto.randomUUID(),
				clientId,
				tokensUsed: usage.tokensUsed,
				costUsd: usage.costUsd,
			})
		}
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
		const hasChunks = [...this.chunks.values()].some(
			(chunk) => chunk.clientId === clientId && chunk.filePath === filePath,
		)
		this.fileStatuses.set(key, {
			filePath,
			status: hasChunks ? "stale" : "failed",
			errorCode,
		})
	}

	async deleteFileData(clientId: string, filePath: string): Promise<void> {
		this.deleteChunks(clientId, filePath)
		this.fileStatuses.delete(`${clientId}::${filePath}`)
		this.rateLimits.delete(`${clientId}::${filePath}`)
	}
}
