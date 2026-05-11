import { createSelectSchema } from "drizzle-zod"
import { z } from "zod"
import { blacklistWords } from "@/schema/blacklist"

export const blacklistWordResponseSchema = createSelectSchema(blacklistWords, {
	word: z.string(),
	createdAt: z.string(),
})

export type BlacklistWordResponse = z.infer<typeof blacklistWordResponseSchema>
