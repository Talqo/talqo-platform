import { z } from "zod"

const noTraversal = (path: string) => !path.includes("..")
const notDirectory = (path: string) => path === "/" || !path.endsWith("/")

export const filePathQuerySchema = z.object({
	path: z
		.string()
		.default("/")
		.refine(noTraversal, { message: "Path must not contain '..'" }),
})

export const filePathBodySchema = z.object({
	path: z
		.string()
		.min(1)
		.refine(noTraversal, { message: "Path must not contain '..'" }),
})

export const fileMoveBodySchema = z.object({
	from: z
		.string()
		.min(1)
		.refine(noTraversal, { message: "Path must not contain '..'" })
		.refine(notDirectory, { message: "Path must not be a directory" }),
	to: z
		.string()
		.min(1)
		.refine(noTraversal, { message: "Path must not contain '..'" })
		.refine(notDirectory, { message: "Path must not be a directory" }),
})

export const fileUploadQuerySchema = z.object({
	path: z
		.string()
		.default("/")
		.refine(noTraversal, { message: "Path must not contain '..'" }),
})

export const filePresignBodySchema = z.object({
	path: z
		.string()
		.min(1)
		.refine(noTraversal, { message: "Path must not contain '..'" })
		.refine(notDirectory, { message: "Path must not be a directory" }),
})
