import {
	customType,
	index,
	integer,
	numeric,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core"
import { RAG_FILE_ERROR_CODE_VALUES, RAG_FILE_STATUS_VALUES } from "shared"
import { clients } from "./client"

export const ragFileStatusEnum = pgEnum(
	"rag_file_status",
	RAG_FILE_STATUS_VALUES,
)

export const ragFileErrorCodeEnum = pgEnum(
	"rag_file_error_code",
	RAG_FILE_ERROR_CODE_VALUES,
)

export const ragFileStatuses = pgTable(
	"rag_file_statuses",
	{
		clientId: uuid("client_id")
			.notNull()
			.references(() => clients.id, { onDelete: "cascade" }),
		filePath: text("file_path").notNull(),
		status: ragFileStatusEnum("status").notNull(),
		errorCode: ragFileErrorCodeEnum("error_code"),
	},
	(table) => [primaryKey({ columns: [table.clientId, table.filePath] })],
)

export const ragFileIndexRateLimits = pgTable(
	"rag_file_index_rate_limits",
	{
		clientId: uuid("client_id")
			.notNull()
			.references(() => clients.id, { onDelete: "cascade" }),
		filePath: text("file_path").notNull(),
		attempts: integer("attempts").notNull().default(1),
		windowStartedAt: timestamp("window_started_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [primaryKey({ columns: [table.clientId, table.filePath] })],
)

export const ragClientOperationLocks = pgTable("rag_client_operation_locks", {
	clientId: uuid("client_id")
		.primaryKey()
		.references(() => clients.id, { onDelete: "cascade" }),
	token: uuid("token").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
})

export const embeddingUsageReservations = pgTable(
	"embedding_usage_reservations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		clientId: uuid("client_id")
			.notNull()
			.references(() => clients.id, { onDelete: "cascade" }),
		tokensUsed: integer("tokens_used").notNull(),
		costUsd: numeric("cost_usd", {
			precision: 16,
			scale: 8,
			mode: "number",
		}).notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	},
	(table) => [index("idx_embedding_reservations_expiry").on(table.expiresAt)],
)

const vector = customType<{
	data: number[]
	driverData: string
}>({
	dataType() {
		return "vector"
	},
	toDriver(val: number[]) {
		if (!Array.isArray(val)) {
			throw new TypeError(`Expected number[], got ${typeof val}`)
		}
		for (let i = 0; i < val.length; i++) {
			if (!Number.isFinite(val[i])) {
				throw new TypeError(`Element at index ${i} is not finite: ${val[i]}`)
			}
		}
		return `[${val.map(String).join(",")}]`
	},
	fromDriver(val: unknown) {
		if (typeof val !== "string") {
			throw new TypeError(
				`Expected string vector format, got ${typeof val}: ${String(val)}`,
			)
		}
		if (!val.startsWith("[") || !val.endsWith("]")) {
			throw new Error(
				`Invalid vector format (must start with "[" and end with "]"): ${val}`,
			)
		}
		const inner = val.slice(1, -1).trim()
		if (!inner) return []
		const tokens = inner.split(",")
		const result: number[] = []
		for (let i = 0; i < tokens.length; i++) {
			const num = Number(tokens[i])
			if (Number.isNaN(num)) {
				throw new Error(
					`Invalid number at token ${i}: "${tokens[i]}" from vector: ${val}`,
				)
			}
			result.push(num)
		}
		return result
	},
})

export const fileEmbeddings = pgTable(
	"file_embeddings",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		clientId: uuid("client_id")
			.notNull()
			.references(() => clients.id, { onDelete: "cascade" }),
		filePath: text("file_path").notNull(),
		chunkIndex: integer("chunk_index").notNull(),
		chunkText: text("chunk_text").notNull(),
		embedding: vector("embedding"),
		embeddingDimensions: integer("embedding_dimensions").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("unique_client_file_chunk").on(
			table.clientId,
			table.filePath,
			table.chunkIndex,
		),
		index("idx_file_embeddings_client_id").on(table.clientId),
		// HNSW index omitted: pgvector requires a fixed dimension at index creation time,
		// but this column is dimensionless to support multiple embedding models.
	],
)
