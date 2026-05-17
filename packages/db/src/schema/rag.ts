import {
	customType,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core"
import { clients } from "./client"

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
		index("idx_file_embeddings_embedding").using(
			"hnsw",
			table.embedding.op("vector_cosine_ops"),
		),
	],
)
