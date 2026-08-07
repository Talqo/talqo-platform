import { and, eq, lt, sql } from "drizzle-orm"
import type { RagFileErrorCode, RagFileStatus } from "shared"
import { BadRequestError, TooManyRequestsError } from "@/common/errors"
import type { DB } from "@/db"
import {
	clients,
	embeddingUsageReservations,
	fileEmbeddings,
	ragFileIndexRateLimits,
	ragFileStatuses,
	ragOperationLocks,
	usageRecords,
} from "@/db/schema"

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

export type FinalUsage = Omit<UsageInsert, "clientId">

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
	consumeFileIndexAttempt(clientId: string, filePath: string): Promise<void>
	reserveEmbeddingUsage(usage: UsageInsert): Promise<string>
	refundEmbeddingUsage(clientId: string, reservationId: string): Promise<void>
	refundExpiredEmbeddingUsage(): Promise<void>
	withLock<T>(key: string, operation: () => Promise<T>): Promise<T>
	listFileStatuses(clientId: string): Promise<RagFileStatusRecord[]>
	replaceFileChunks(
		clientId: string,
		filePath: string,
		chunks: FileChunk[],
		reservationId?: string,
		finalUsage?: FinalUsage,
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

export function validateUsage(usage: UsageInsert): void {
	if (
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
}

export class DrizzleRagRepository implements RagRepository {
	constructor(private readonly db: DB) {}

	async deleteByClientId(clientId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			await tx
				.delete(ragFileIndexRateLimits)
				.where(eq(ragFileIndexRateLimits.clientId, clientId))
			await tx
				.delete(ragFileStatuses)
				.where(eq(ragFileStatuses.clientId, clientId))
			await tx
				.delete(fileEmbeddings)
				.where(eq(fileEmbeddings.clientId, clientId))
		})
	}

	async renameFilePath(
		clientId: string,
		oldPath: string,
		newPath: string,
	): Promise<void> {
		await this.db.transaction(async (tx) => {
			await tx
				.delete(ragFileIndexRateLimits)
				.where(
					and(
						eq(ragFileIndexRateLimits.clientId, clientId),
						eq(ragFileIndexRateLimits.filePath, newPath),
					),
				)
			await tx
				.update(ragFileIndexRateLimits)
				.set({ filePath: newPath })
				.where(
					and(
						eq(ragFileIndexRateLimits.clientId, clientId),
						eq(ragFileIndexRateLimits.filePath, oldPath),
					),
				)
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
		validateUsage(usage)
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

	async consumeFileIndexAttempt(
		clientId: string,
		filePath: string,
	): Promise<void> {
		const resetBefore = new Date(Date.now() - 60_000)
		await this.db
			.delete(ragFileIndexRateLimits)
			.where(
				and(
					eq(ragFileIndexRateLimits.clientId, clientId),
					lt(ragFileIndexRateLimits.windowStartedAt, resetBefore),
				),
			)
		const [window] = await this.db
			.insert(ragFileIndexRateLimits)
			.values({ clientId, filePath })
			.onConflictDoUpdate({
				target: [
					ragFileIndexRateLimits.clientId,
					ragFileIndexRateLimits.filePath,
				],
				set: {
					attempts: sql`CASE WHEN ${ragFileIndexRateLimits.windowStartedAt} < ${resetBefore.toISOString()}::timestamptz THEN 1 ELSE ${ragFileIndexRateLimits.attempts} + 1 END`,
					windowStartedAt: sql`CASE WHEN ${ragFileIndexRateLimits.windowStartedAt} < ${resetBefore.toISOString()}::timestamptz THEN now() ELSE ${ragFileIndexRateLimits.windowStartedAt} END`,
				},
			})
			.returning({ attempts: ragFileIndexRateLimits.attempts })
		if (window && window.attempts > 3) {
			throw new TooManyRequestsError("Too many reindex attempts")
		}
	}

	async reserveEmbeddingUsage(usage: UsageInsert): Promise<string> {
		validateUsage(usage)
		return this.db.transaction(async (tx) => {
			const expired = await tx
				.delete(embeddingUsageReservations)
				.where(
					and(
						eq(embeddingUsageReservations.clientId, usage.clientId),
						lt(embeddingUsageReservations.expiresAt, new Date()),
					),
				)
				.returning({ costUsd: embeddingUsageReservations.costUsd })
			const expiredCost = expired.reduce(
				(total, reservation) => total + reservation.costUsd,
				0,
			)
			if (expiredCost > 0) {
				await tx
					.update(clients)
					.set({ balanceUsd: sql`${clients.balanceUsd} + ${expiredCost}` })
					.where(eq(clients.id, usage.clientId))
			}

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
				const [client] = await tx
					.select({ id: clients.id })
					.from(clients)
					.where(eq(clients.id, usage.clientId))
				throw new BadRequestError(
					client ? "BALANCE_INSUFFICIENT" : "CLIENT_NOT_FOUND",
					client ? "Insufficient balance" : "Client not found",
				)
			}
			const [reservation] = await tx
				.insert(embeddingUsageReservations)
				.values({
					...usage,
					expiresAt: new Date(Date.now() + 10 * 60_000),
				})
				.returning({ id: embeddingUsageReservations.id })
			if (!reservation) throw new Error("Failed to reserve embedding usage")
			return reservation.id
		})
	}

	async refundEmbeddingUsage(
		clientId: string,
		reservationId: string,
	): Promise<void> {
		await this.db.transaction(async (tx) => {
			const [reservation] = await tx
				.delete(embeddingUsageReservations)
				.where(
					and(
						eq(embeddingUsageReservations.id, reservationId),
						eq(embeddingUsageReservations.clientId, clientId),
					),
				)
				.returning({ costUsd: embeddingUsageReservations.costUsd })
			if (reservation) {
				await tx
					.update(clients)
					.set({
						balanceUsd: sql`${clients.balanceUsd} + ${reservation.costUsd}`,
					})
					.where(eq(clients.id, clientId))
			}
		})
	}

	async refundExpiredEmbeddingUsage(): Promise<void> {
		await this.db.transaction(async (tx) => {
			const expired = await tx
				.delete(embeddingUsageReservations)
				.where(lt(embeddingUsageReservations.expiresAt, new Date()))
				.returning({
					clientId: embeddingUsageReservations.clientId,
					costUsd: embeddingUsageReservations.costUsd,
				})
			const refunds = new Map<string, number>()
			for (const reservation of expired) {
				refunds.set(
					reservation.clientId,
					(refunds.get(reservation.clientId) ?? 0) + reservation.costUsd,
				)
			}
			for (const [clientId, costUsd] of refunds) {
				await tx
					.update(clients)
					.set({ balanceUsd: sql`${clients.balanceUsd} + ${costUsd}` })
					.where(eq(clients.id, clientId))
			}
		})
	}

	async withLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
		const token = crypto.randomUUID()
		const deadline = Date.now() + 3 * 60_000
		let delayMs = 50
		while (true) {
			const now = new Date()
			const [lock] = await this.db
				.insert(ragOperationLocks)
				.values({
					key,
					token,
					expiresAt: new Date(Date.now() + 3 * 60_000),
				})
				.onConflictDoUpdate({
					target: ragOperationLocks.key,
					set: {
						token,
						expiresAt: new Date(Date.now() + 3 * 60_000),
					},
					setWhere: lt(ragOperationLocks.expiresAt, now),
				})
				.returning({ token: ragOperationLocks.token })
			if (lock?.token === token) break
			if (Date.now() >= deadline) {
				throw new TooManyRequestsError("File operation is still in progress")
			}
			await Bun.sleep(delayMs)
			delayMs = Math.min(delayMs * 2, 1_000)
		}

		try {
			return await operation()
		} finally {
			await this.db
				.delete(ragOperationLocks)
				.where(
					and(
						eq(ragOperationLocks.key, key),
						eq(ragOperationLocks.token, token),
					),
				)
		}
	}

	async listFileStatuses(clientId: string): Promise<RagFileStatusRecord[]> {
		return this.db
			.select({
				filePath: ragFileStatuses.filePath,
				status: ragFileStatuses.status,
				errorCode: ragFileStatuses.errorCode,
			})
			.from(ragFileStatuses)
			.where(eq(ragFileStatuses.clientId, clientId))
	}

	async replaceFileChunks(
		clientId: string,
		filePath: string,
		chunks: FileChunk[],
		reservationId?: string,
		finalUsage?: FinalUsage,
	): Promise<void> {
		await this.db.transaction(async (tx) => {
			if (reservationId) {
				const [reservation] = await tx
					.delete(embeddingUsageReservations)
					.where(
						and(
							eq(embeddingUsageReservations.id, reservationId),
							eq(embeddingUsageReservations.clientId, clientId),
						),
					)
					.returning({
						tokensUsed: embeddingUsageReservations.tokensUsed,
						costUsd: embeddingUsageReservations.costUsd,
					})
				if (!reservation) throw new Error("Embedding reservation not found")
				const usage = finalUsage ?? reservation
				validateUsage({ clientId, ...usage })
				const costDifference = usage.costUsd - reservation.costUsd
				if (costDifference > 0) {
					await tx
						.update(clients)
						.set({
							balanceUsd: sql`${clients.balanceUsd} - ${costDifference}`,
						})
						.where(eq(clients.id, clientId))
				} else if (costDifference < 0) {
					await tx
						.update(clients)
						.set({
							balanceUsd: sql`${clients.balanceUsd} + ${-costDifference}`,
						})
						.where(eq(clients.id, clientId))
				}
				await tx.insert(usageRecords).values({
					clientId,
					messageId: null,
					type: "embedding",
					tokensUsed: usage.tokensUsed,
					costUsd: usage.costUsd,
				})
			}
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
		const [existingChunk] = await this.db
			.select({ chunkIndex: fileEmbeddings.chunkIndex })
			.from(fileEmbeddings)
			.where(
				and(
					eq(fileEmbeddings.clientId, clientId),
					eq(fileEmbeddings.filePath, filePath),
				),
			)
			.limit(1)
		const status = existingChunk ? "stale" : "failed"
		await this.db
			.insert(ragFileStatuses)
			.values({ clientId, filePath, status, errorCode })
			.onConflictDoUpdate({
				target: [ragFileStatuses.clientId, ragFileStatuses.filePath],
				set: { status, errorCode },
			})
	}

	async deleteFileData(clientId: string, filePath: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			await tx
				.delete(ragFileIndexRateLimits)
				.where(
					and(
						eq(ragFileIndexRateLimits.clientId, clientId),
						eq(ragFileIndexRateLimits.filePath, filePath),
					),
				)
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
