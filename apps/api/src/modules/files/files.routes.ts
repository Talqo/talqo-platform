import { createRoute, z } from "@hono/zod-openapi"
import {
	fileMoveBodySchema,
	filePathBodySchema,
	filePathQuerySchema,
	filePresignBodySchema,
	fileUploadQuerySchema,
} from "shared"
import { NotFoundError, ValidationError } from "@/common/errors"
import type { AppVariables } from "@/common/jwt"
import { createRouter } from "@/common/router"
import { errorResponseSchema, successResponseSchema } from "@/common/schemas"
import type { FilesService } from "./files.service"

// Minimal interface — avoids importing from rag/index and creating a circular dep
type FileIndexer = {
	indexFile(clientId: string, filePath: string): Promise<void>
	removeFile(clientId: string, filePath: string): Promise<void>
	renameFile(clientId: string, oldPath: string, newPath: string): Promise<void>
	listFileStatuses(clientId: string): Promise<
		Array<{
			filePath: string
			status: "indexed" | "failed"
			errorCode: "insufficient_balance" | "provider_error" | null
		}>
	>
}

// ─── Response schemas ─────────────────────────────────────────────────────────

const fileEntrySchema = z.object({
	name: z.string(),
	type: z.enum(["file", "directory"]),
	size: z.number().optional(),
	lastModified: z.string().optional(),
	embeddingStatus: z.enum(["indexed", "failed"]).optional(),
	embeddingError: z
		.enum(["insufficient_balance", "provider_error"])
		.nullable()
		.optional(),
})

const listResponseSchema = z.object({
	entries: z.array(fileEntrySchema),
})

const presignResponseSchema = z.object({
	url: z.string(),
})

const uploadResponseSchema = z.object({
	path: z.string(),
})

const messageResponseSchema = z.object({
	message: z.string(),
})

// ─── Path helpers ─────────────────────────────────────────────────────────────

/**
 * Sanitizes a user-supplied path and prepends the client prefix.
 * Assumes the path has already been validated by Zod (no traversal sequences).
 */
function buildKey(clientId: string, userPath: string): string {
	const normalized = userPath.replace(/^\/+/, "").replace(/\/+$/, "")
	return normalized ? `${clientId}/${normalized}` : `${clientId}/`
}

/**
 * Same as buildKey but always appends a trailing slash — used for directory prefixes.
 */
function buildDirKey(clientId: string, userPath: string): string {
	const key = buildKey(clientId, userPath)
	return key.endsWith("/") ? key : `${key}/`
}

/**
 * Strips the `{clientId}/` prefix from an S3 key to get the client-relative path.
 */
function relativePath(clientId: string, key: string): string {
	return key.slice(`${clientId}/`.length)
}

// ─── Router factory ───────────────────────────────────────────────────────────

export function createFilesRouter(service: FilesService, rag: FileIndexer) {
	const router = createRouter<{ Variables: AppVariables }>()

	// ─── GET / — list directory ───────────────────────────────────────────────

	router.openapi(
		createRoute({
			method: "get",
			path: "/",
			tags: ["Files"],
			summary: "List directory contents",
			security: [{ bearerAuth: [] }],
			request: {
				query: filePathQuerySchema,
			},
			responses: {
				200: {
					description: "Directory listing",
					content: {
						"application/json": {
							schema: successResponseSchema(listResponseSchema),
						},
					},
				},
				422: {
					description: "Invalid path",
					content: { "application/json": { schema: errorResponseSchema } },
				},
			},
		}),
		async (c) => {
			const clientId = c.get("clientId" as never) as string
			const { path } = c.req.valid("query")

			const prefix = buildDirKey(clientId, path)

			const [{ files, directories }, statuses] = await Promise.all([
				service.list(prefix),
				rag.listFileStatuses(clientId),
			])
			const statusByPath = new Map(
				statuses.map((status) => [status.filePath, status]),
			)

			const entries = [
				...files.map((f) => {
					const name = relativePath(clientId, f.key)
					const embedding = statusByPath.get(name)
					return {
						name,
						type: "file" as const,
						size: f.size,
						lastModified: f.lastModified.toISOString(),
						embeddingStatus: embedding?.status,
						embeddingError: embedding?.errorCode,
					}
				}),
				...directories.map((d) => ({
					name: relativePath(clientId, d),
					type: "directory" as const,
				})),
			]

			return c.json({ entries }, 200)
		},
	)

	// ─── POST / — upload file ─────────────────────────────────────────────────

	router.openapi(
		createRoute({
			method: "post",
			path: "/",
			tags: ["Files"],
			summary: "Upload a file",
			security: [{ bearerAuth: [] }],
			request: {
				query: fileUploadQuerySchema,
				body: {
					content: {
						"multipart/form-data": {
							schema: z.object({
								file: z.any().openapi({ type: "string", format: "binary" }),
							}),
						},
					},
				},
			},
			responses: {
				201: {
					description: "File uploaded",
					content: {
						"application/json": {
							schema: successResponseSchema(uploadResponseSchema),
						},
					},
				},
				422: {
					description: "Invalid path or missing file",
					content: { "application/json": { schema: errorResponseSchema } },
				},
			},
		}),
		async (c) => {
			const clientId = c.get("clientId" as never) as string
			const { path } = c.req.valid("query")

			const dirKey = buildDirKey(clientId, path)

			const body = await c.req.parseBody()
			const file = body.file

			if (!(file instanceof File)) {
				throw new ValidationError("Missing or invalid `file` field")
			}

			if (
				file.name.includes("/") ||
				file.name.includes("\\") ||
				file.name.includes("..")
			) {
				throw new ValidationError("Invalid file name")
			}

			const key = `${dirKey}${file.name}`
			await service.upload(key, file, { contentType: file.type || undefined })

			const filePath = relativePath(clientId, key)
			return c.json({ path: `/${filePath}` }, 201)
		},
	)

	// ─── POST /reindex — retry RAG indexing ───────────────────────────────────

	router.openapi(
		createRoute({
			method: "post",
			path: "/reindex",
			tags: ["Files"],
			summary: "Retry file embedding",
			security: [{ bearerAuth: [] }],
			request: {
				body: {
					content: { "application/json": { schema: filePathBodySchema } },
				},
			},
			responses: {
				200: {
					description: "Indexing finished",
					content: {
						"application/json": {
							schema: successResponseSchema(messageResponseSchema),
						},
					},
				},
				422: {
					description: "Invalid path",
					content: { "application/json": { schema: errorResponseSchema } },
				},
				404: {
					description: "File not found",
					content: { "application/json": { schema: errorResponseSchema } },
				},
			},
		}),
		async (c) => {
			const clientId = c.get("clientId" as never) as string
			const { path } = c.req.valid("json")
			const key = buildKey(clientId, path)
			const filePath = relativePath(clientId, key)
			if (!(await service.exists(key))) {
				throw new NotFoundError("File not found")
			}
			try {
				await rag.indexFile(clientId, filePath)
			} catch (err) {
				c.get("logger").error("rag reindexFile failed", { err })
			}
			return c.json({ message: "Indexing finished" }, 200)
		},
	)

	// ─── POST /presign — get presigned download URL ───────────────────────────

	router.openapi(
		createRoute({
			method: "post",
			path: "/presign",
			tags: ["Files"],
			summary: "Get a presigned download URL for a file",
			security: [{ bearerAuth: [] }],
			request: {
				body: {
					content: {
						"application/json": {
							schema: filePresignBodySchema,
						},
					},
				},
			},
			responses: {
				200: {
					description: "Presigned URL",
					content: {
						"application/json": {
							schema: successResponseSchema(presignResponseSchema),
						},
					},
				},
				422: {
					description: "Invalid path",
					content: { "application/json": { schema: errorResponseSchema } },
				},
			},
		}),
		async (c) => {
			const clientId = c.get("clientId" as never) as string
			const { path } = c.req.valid("json")

			const key = buildKey(clientId, path)

			const url = service.presign(key)

			return c.json({ url }, 200)
		},
	)

	// ─── DELETE / — delete file or directory marker ───────────────────────────

	router.openapi(
		createRoute({
			method: "delete",
			path: "/",
			tags: ["Files"],
			summary: "Delete a file or directory marker",
			security: [{ bearerAuth: [] }],
			request: {
				query: filePathQuerySchema,
			},
			responses: {
				200: {
					description: "Deleted",
					content: {
						"application/json": {
							schema: successResponseSchema(messageResponseSchema),
						},
					},
				},
				422: {
					description: "Invalid path",
					content: { "application/json": { schema: errorResponseSchema } },
				},
			},
		}),
		async (c) => {
			const clientId = c.get("clientId" as never) as string
			const { path } = c.req.valid("query")

			const key = buildKey(clientId, path)
			if (key === `${clientId}/`)
				throw new ValidationError("Invalid path — cannot delete root")

			const filePath = relativePath(clientId, key)
			await service.delete(key)
			await rag.removeFile(clientId, filePath)

			return c.json({ message: "Deleted" }, 200)
		},
	)

	// ─── POST /mkdir — create directory marker ────────────────────────────────

	router.openapi(
		createRoute({
			method: "post",
			path: "/mkdir",
			tags: ["Files"],
			summary: "Create a directory",
			security: [{ bearerAuth: [] }],
			request: {
				body: {
					content: {
						"application/json": {
							schema: filePathBodySchema,
						},
					},
				},
			},
			responses: {
				201: {
					description: "Directory created",
					content: {
						"application/json": {
							schema: successResponseSchema(messageResponseSchema),
						},
					},
				},
				422: {
					description: "Invalid path",
					content: { "application/json": { schema: errorResponseSchema } },
				},
			},
		}),
		async (c) => {
			const clientId = c.get("clientId" as never) as string
			const { path } = c.req.valid("json")

			const key = buildDirKey(clientId, path)
			if (key === `${clientId}/`)
				throw new ValidationError("Invalid directory path")

			// Zero-byte marker with trailing slash — S3 convention for directories
			await service.upload(key, new Uint8Array(0))

			return c.json({ message: "Directory created" }, 201)
		},
	)

	// ─── POST /move — move or rename a file ──────────────────────────────────

	router.openapi(
		createRoute({
			method: "post",
			path: "/move",
			tags: ["Files"],
			summary: "Move or rename a file",
			security: [{ bearerAuth: [] }],
			request: {
				body: {
					content: {
						"application/json": {
							schema: fileMoveBodySchema,
						},
					},
				},
			},
			responses: {
				200: {
					description: "File moved",
					content: {
						"application/json": {
							schema: successResponseSchema(messageResponseSchema),
						},
					},
				},
				422: {
					description: "Invalid path",
					content: { "application/json": { schema: errorResponseSchema } },
				},
			},
		}),
		async (c) => {
			const clientId = c.get("clientId" as never) as string
			const { from, to } = c.req.valid("json")

			const fromKey = buildKey(clientId, from)
			const toKey = buildKey(clientId, to)

			if (fromKey === `${clientId}/` || toKey === `${clientId}/`) {
				throw new ValidationError("Invalid path — cannot move from or to root")
			}

			const oldPath = relativePath(clientId, fromKey)
			const newPath = relativePath(clientId, toKey)
			await service.move(fromKey, toKey)
			try {
				await rag.renameFile(clientId, oldPath, newPath)
			} catch (error) {
				await service.move(toKey, fromKey)
				throw error
			}

			return c.json({ message: "Moved" }, 200)
		},
	)

	return router
}
