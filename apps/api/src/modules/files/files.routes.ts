import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi"
import {
	fileMoveBodySchema,
	filePathBodySchema,
	filePathQuerySchema,
	filePresignBodySchema,
	fileUploadQuerySchema,
} from "shared"
import { ValidationError } from "../../common/errors"
import type { AppVariables } from "../../common/jwt"
import {
	errorResponseSchema,
	successResponseSchema,
} from "../../common/schemas"
import type { FilesService } from "./files.service"

// ─── Response schemas ─────────────────────────────────────────────────────────

const fileEntrySchema = z.object({
	name: z.string(),
	type: z.enum(["file", "directory"]),
	size: z.number().optional(),
	lastModified: z.string().optional(),
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

export function createFilesRouter(service: FilesService) {
	const router = new OpenAPIHono<{ Variables: AppVariables }>()

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
				400: {
					description: "Invalid path",
					content: { "application/json": { schema: errorResponseSchema } },
				},
			},
		}),
		async (c) => {
			const clientId = c.get("clientId" as never) as string
			const { path } = c.req.valid("query")

			const prefix = buildDirKey(clientId, path)

			const { files, directories } = await service.list(prefix)

			const entries = [
				...files.map((f) => ({
					name: relativePath(clientId, f.key),
					type: "file" as const,
					size: f.size,
					lastModified: f.lastModified.toISOString(),
				})),
				...directories.map((d) => ({
					name: relativePath(clientId, d),
					type: "directory" as const,
				})),
			]

			return c.json({ success: true as const, data: { entries } }, 200)
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
				400: {
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

			const key = `${dirKey}${file.name}`
			await service.upload(key, file, { contentType: file.type || undefined })

			return c.json(
				{
					success: true as const,
					data: { path: `/${relativePath(clientId, key)}` },
				},
				201,
			)
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
				400: {
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

			return c.json({ success: true as const, data: { url } }, 200)
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
				400: {
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

			await service.delete(key)

			return c.json(
				{ success: true as const, data: { message: "Deleted" } },
				200,
			)
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
				400: {
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

			return c.json(
				{ success: true as const, data: { message: "Directory created" } },
				201,
			)
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
				400: {
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

			await service.move(fromKey, toKey)

			return c.json({ success: true as const, data: { message: "Moved" } }, 200)
		},
	)

	return router
}
