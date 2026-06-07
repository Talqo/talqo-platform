import { z } from "zod"

export const errorResponseSchema = z.object({
	error: z.object({
		code: z.string(),
		message: z.string(),
	}),
})

export function successResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
	return dataSchema
}
