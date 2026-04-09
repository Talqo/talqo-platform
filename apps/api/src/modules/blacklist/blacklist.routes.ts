import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi"
import { blacklistWordResponseSchema } from "db/dto"
import { addWordBodySchema } from "shared"
import {
	errorResponseSchema,
	successResponseSchema,
} from "../../common/schemas"
import { blacklistService } from "./index"

const router = new OpenAPIHono()

router.openapi(
	createRoute({
		method: "get",
		path: "/",
		tags: ["Blacklist"],
		summary: "List blacklisted words",
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				description: "Blacklist",
				content: {
					"application/json": {
						schema: successResponseSchema(z.array(blacklistWordResponseSchema)),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string
		const words = await blacklistService.listWords(clientId)
		return c.json({ success: true as const, data: words }, 200)
	},
)

router.openapi(
	createRoute({
		method: "post",
		path: "/",
		tags: ["Blacklist"],
		summary: "Add a word to the blacklist",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: addWordBodySchema,
					},
				},
			},
		},
		responses: {
			201: {
				description: "Word added",
				content: {
					"application/json": {
						schema: successResponseSchema(blacklistWordResponseSchema),
					},
				},
			},
			409: {
				description: "Word already in blacklist",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string
		const { word } = c.req.valid("json")
		const result = await blacklistService.addWord(clientId, word)
		return c.json({ success: true as const, data: result }, 201)
	},
)

router.openapi(
	createRoute({
		method: "delete",
		path: "/:wordId",
		tags: ["Blacklist"],
		summary: "Remove a word from the blacklist",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({ wordId: z.string().uuid() }),
		},
		responses: {
			200: {
				description: "Word removed",
				content: {
					"application/json": {
						schema: successResponseSchema(z.object({ message: z.string() })),
					},
				},
			},
			404: {
				description: "Word not found",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId" as never) as string
		const { wordId } = c.req.valid("param")
		await blacklistService.removeWord(clientId, wordId)
		return c.json(
			{ success: true as const, data: { message: "Word removed" } },
			200,
		)
	},
)

export default router
