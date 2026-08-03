import { z } from "zod"

const noTraversal = (path: string) => !path.includes("..")
const notDirectory = (path: string) => path === "/" || !path.endsWith("/")

export const RAG_FILE_STATUS_VALUES = ["indexed", "failed"] as const
export type RagFileStatus = (typeof RAG_FILE_STATUS_VALUES)[number]
export const ragFileStatusSchema = z.enum(RAG_FILE_STATUS_VALUES)

export const RAG_FILE_ERROR_CODE_VALUES = [
	"insufficient_balance",
	"provider_error",
	"indexing_error",
] as const
export type RagFileErrorCode = (typeof RAG_FILE_ERROR_CODE_VALUES)[number]
export const ragFileErrorCodeSchema = z.enum(RAG_FILE_ERROR_CODE_VALUES)

export const filePathQuerySchema = z.object({
	path: z
		.string()
		.max(1024)
		.default("/")
		.refine(noTraversal, { message: "Path must not contain '..'" }),
})

export const filePathBodySchema = z.object({
	path: z
		.string()
		.min(1)
		.max(1024)
		.refine(noTraversal, { message: "Path must not contain '..'" }),
})

export const fileMoveBodySchema = z.object({
	from: z
		.string()
		.min(1)
		.max(1024)
		.refine(noTraversal, { message: "Path must not contain '..'" })
		.refine(notDirectory, { message: "Path must not be a directory" }),
	to: z
		.string()
		.min(1)
		.max(1024)
		.refine(noTraversal, { message: "Path must not contain '..'" })
		.refine(notDirectory, { message: "Path must not be a directory" }),
})

export const fileUploadQuerySchema = z.object({
	path: z
		.string()
		.max(1024)
		.default("/")
		.refine(noTraversal, { message: "Path must not contain '..'" }),
})

export const filePresignBodySchema = z.object({
	path: z
		.string()
		.min(1)
		.max(1024)
		.refine(noTraversal, { message: "Path must not contain '..'" })
		.refine(notDirectory, { message: "Path must not be a directory" }),
})
