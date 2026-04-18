import { z } from "zod"

export const analyticsQuerySchema = z.object({
	from: z.string().optional(),
	to: z.string().optional(),
	granularity: z.enum(["day", "week", "month"]).optional(),
})
