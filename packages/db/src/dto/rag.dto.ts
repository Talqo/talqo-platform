import { createSelectSchema } from "drizzle-zod"
import { z } from "zod"
import { fileEmbeddings } from "@/schema/rag"

export const fileEmbeddingSchema = createSelectSchema(fileEmbeddings, {
	embedding: z.array(z.number()).nullable(),
	createdAt: z.string(),
})

export type FileEmbedding = z.infer<typeof fileEmbeddingSchema>
