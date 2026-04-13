import { z } from "zod"

export const filePathQuerySchema = z.object({
	path: z.string().default("/"),
})

export const filePathBodySchema = z.object({
	path: z.string().min(1),
})

export const fileMoveBodySchema = z.object({
	from: z.string().min(1),
	to: z.string().min(1),
})

export const fileUploadQuerySchema = z.object({
	path: z.string().default("/"),
})

export const filePresignBodySchema = z.object({
	path: z.string().min(1),
})
