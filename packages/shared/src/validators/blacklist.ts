import { z } from "zod"

export const addWordBodySchema = z.object({
	word: z.string().min(1).max(255),
})
