import { createRoute, z } from "@hono/zod-openapi"
import { aiProviderConfigMaskedResponseSchema } from "db/dto"
import { upsertProviderConfigBodySchema } from "shared"
import type { AppVariables } from "@/common/jwt"
import { createRouter } from "@/common/router"
import { errorResponseSchema, successResponseSchema } from "@/common/schemas"
import { filesService } from "@/modules/files/index"
import { providerConfigService } from "./index"

const router = createRouter<{ Variables: AppVariables }>()

router.openapi(
	createRoute({
		method: "get",
		path: "/",
		tags: ["Provider Config"],
		summary: "Get current AI provider configuration",
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				description: "Provider config or null (platform default)",
				content: {
					"application/json": {
						schema: successResponseSchema(
							aiProviderConfigMaskedResponseSchema.nullable(),
						),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		const config = await providerConfigService.getConfig(clientId)
		return c.json(config, 200)
	},
)

router.openapi(
	createRoute({
		method: "put",
		path: "/",
		tags: ["Provider Config"],
		summary: "Create or replace AI provider configuration",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					"application/json": { schema: upsertProviderConfigBodySchema },
				},
			},
		},
		responses: {
			200: {
				description: "Upserted provider config",
				content: {
					"application/json": {
						schema: successResponseSchema(
							aiProviderConfigMaskedResponseSchema.nullable(),
						),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		const body = c.req.valid("json")

		const oldConfig = await providerConfigService.getConfig(clientId)
		const config = await providerConfigService.upsertConfig(clientId, {
			providerType: body.providerType,
			apiKey: body.apiKey,
			model: body.model,
			baseUrl: "baseUrl" in body ? body.baseUrl : undefined,
			embeddingModel: body.embeddingModel,
		})
		const response = c.json(config, 200)
		const logger = c.get("logger")

		const shouldReindex =
			oldConfig === null ||
			oldConfig.providerType !== body.providerType ||
			oldConfig.embeddingModel !== body.embeddingModel

		if (!shouldReindex) {
			return response
		}

		void (async () => {
			try {
				const { ragService } = await import("@/modules/rag/index")

				const filePaths: string[] = []
				const prefix = `${clientId}/`
				const queue = [prefix]
				while (queue.length > 0) {
					const current = queue.pop() as string
					const listing = await filesService.list(current)
					for (const dir of listing.directories) {
						queue.push(dir)
					}
					for (const file of listing.files) {
						filePaths.push(file.key.slice(prefix.length))
					}
				}

				const BATCH_SIZE = 5
				for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
					const batch = filePaths.slice(i, i + BATCH_SIZE)
					const results = await Promise.allSettled(
						batch.map((filePath) => ragService.indexFile(clientId, filePath)),
					)
					for (let j = 0; j < results.length; j++) {
						const result = results[j]
						if (result.status === "rejected") {
							logger.error("rag indexFile failed for file", {
								clientId,
								filePath: batch[j],
								err: result.reason,
							})
						}
					}
				}
			} catch (err) {
				logger.error("rag re-index failed", { clientId, err })
			}
		})()

		return response
	},
)

router.openapi(
	createRoute({
		method: "delete",
		path: "/",
		tags: ["Provider Config"],
		summary: "Remove AI provider configuration (reverts to platform default)",
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				description: "Deleted successfully",
				content: {
					"application/json": {
						schema: successResponseSchema(
							z.object({ deleted: z.literal(true) }),
						),
					},
				},
			},
			404: {
				description: "No provider config found",
				content: {
					"application/json": { schema: errorResponseSchema },
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		await providerConfigService.deleteConfig(clientId)
		const response = c.json({ deleted: true as const }, 200)
		const logger = c.get("logger")

		void (async () => {
			try {
				const { ragService } = await import("@/modules/rag/index")
				const maxRetries = 3
				let lastErr: unknown

				for (let attempt = 0; attempt < maxRetries; attempt++) {
					try {
						await ragService.removeAllFiles(clientId)
						return
					} catch (err) {
						lastErr = err
						if (attempt < maxRetries - 1) {
							const delayMs = Math.min(1000 * 2 ** attempt, 10000)
							await new Promise((resolve) => setTimeout(resolve, delayMs))
						}
					}
				}

				logger.error("rag cleanup failed after retries", {
					clientId,
					err: lastErr,
				})
			} catch (err) {
				logger.error("rag cleanup failed", { clientId, err })
			}
		})()

		return response
	},
)

export default router
