import { createSelectSchema } from "drizzle-zod"
import { z } from "zod"
import { usageRecords } from "@/schema/usage"

export const usageRecordResponseSchema = createSelectSchema(usageRecords, {
	messageId: z.string().uuid().nullable(),
	type: z.enum(["message", "embedding"]),
	costUsd: z.string(),
	recordedAt: z.string(),
})

export type UsageRecordResponse = z.infer<typeof usageRecordResponseSchema>
