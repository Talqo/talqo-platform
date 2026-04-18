import { z } from "zod"

export const errorResponseSchema = z.object({
	success: z.literal(false),
	error: z.object({
		code: z.string(),
		message: z.string(),
	}),
})

export function successResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
	return z.object({
		success: z.literal(true),
		data: dataSchema,
	})
}
