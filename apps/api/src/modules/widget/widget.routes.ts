import { createRoute, z } from "@hono/zod-openapi"
import * as Sentry from "@sentry/bun"
import {
	conversationResponseSchema,
	messageResponseSchema,
	sessionResponseSchema,
} from "db/dto"
import { streamSSE } from "hono/streaming"
import {
	createSessionBodySchema,
	rateConversationBodySchema,
	sendMessageBodySchema,
	widgetVisualConfigSchema,
} from "shared"
import { BlacklistError } from "@/common/errors"
import type { AppVariables } from "@/common/jwt"
import { widgetRateLimit } from "@/common/middleware/widget-rate-limit"
import { createRouter } from "@/common/router"
import { errorResponseSchema, successResponseSchema } from "@/common/schemas"
import { classifyAiStreamError } from "@/modules/agent/agent.errors"
import { widgetConfigService } from "@/modules/widget-config"
import { widgetService } from "./index"

// ─── Session routes ────────────────────────────────────────────────────────────

export const widgetSessionRoutes = createRouter<{ Variables: AppVariables }>()

widgetSessionRoutes.openapi(
	createRoute({
		method: "post",
		path: "/",
		tags: ["Widget"],
		summary: "Create or resume a browser session",
		security: [{ widgetToken: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: createSessionBodySchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Session created or resumed",
				content: {
					"application/json": {
						schema: successResponseSchema(sessionResponseSchema),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		const { browserSessionId } = c.req.valid("json")
		const { session, isNew } = await widgetService.createOrResumeSession(
			clientId,
			browserSessionId,
		)
		const wideEvent = c.get("wideEvent")
		if (wideEvent)
			wideEvent.widget = { session_id: session.id, is_new_session: isNew }
		return c.json(session, 200)
	},
)

// ─── Conversation routes ───────────────────────────────────────────────────────

export const widgetConversationRoutes = createRouter<{
	Variables: AppVariables
}>()

widgetConversationRoutes.openapi(
	createRoute({
		method: "post",
		path: "/",
		tags: ["Widget"],
		summary: "Start a new conversation",
		security: [{ widgetToken: [] }],
		request: {
			params: z.object({ sessionId: z.string().uuid() }),
		},
		responses: {
			201: {
				description: "Conversation started",
				content: {
					"application/json": {
						schema: successResponseSchema(conversationResponseSchema),
					},
				},
			},
			404: {
				description: "Session not found",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		const sessionId = c.req.valid("param").sessionId
		const conversation = await widgetService.startConversation(
			clientId,
			sessionId,
		)
		const wideEvent = c.get("wideEvent")
		if (wideEvent)
			wideEvent.widget = {
				session_id: sessionId,
				conversation_id: conversation.id,
			}
		return c.json(conversation, 201)
	},
)

widgetConversationRoutes.openapi(
	createRoute({
		method: "patch",
		path: "/{conversationId}",
		tags: ["Widget"],
		summary: "Submit satisfaction rating",
		security: [{ widgetToken: [] }],
		request: {
			params: z.object({ conversationId: z.string().uuid() }),
			body: {
				content: {
					"application/json": {
						schema: rateConversationBodySchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Rating submitted",
				content: {
					"application/json": {
						schema: successResponseSchema(conversationResponseSchema),
					},
				},
			},
			404: {
				description: "Conversation not found",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		const { conversationId } = c.req.valid("param")
		const { rating } = c.req.valid("json")
		const updated = await widgetService.rateConversation(
			clientId,
			conversationId,
			rating,
		)
		return c.json(updated, 200)
	},
)

// ─── Message routes ────────────────────────────────────────────────────────────

export const widgetMessageRoutes = createRouter<{ Variables: AppVariables }>()

widgetMessageRoutes.use(widgetRateLimit)

widgetMessageRoutes.openapi(
	createRoute({
		method: "get",
		path: "/",
		tags: ["Widget"],
		summary: "Get conversation message history",
		security: [{ widgetToken: [] }],
		request: {
			params: z.object({ conversationId: z.string().uuid() }),
		},
		responses: {
			200: {
				description: "Message history",
				content: {
					"application/json": {
						schema: successResponseSchema(z.array(messageResponseSchema)),
					},
				},
			},
			404: {
				description: "Conversation not found",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		const { conversationId } = c.req.valid("param")
		const msgs = await widgetService.getMessageHistory(clientId, conversationId)
		const wideEvent = c.get("wideEvent")
		if (wideEvent)
			wideEvent.widget = {
				session_id: c.req.param("sessionId"),
				conversation_id: conversationId,
			}
		return c.json(msgs, 200)
	},
)

widgetMessageRoutes.openapi(
	createRoute({
		method: "post",
		path: "/",
		tags: ["Widget"],
		summary: "Send a message (streams AI response via SSE)",
		security: [{ widgetToken: [] }],
		request: {
			params: z.object({ conversationId: z.string().uuid() }),
			body: {
				content: {
					"application/json": {
						schema: sendMessageBodySchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: "SSE stream of AI response",
				content: {
					"text/event-stream": {
						schema: z.object({ event: z.string(), data: z.string() }),
					},
				},
			},
			404: {
				description: "Conversation not found",
				content: { "application/json": { schema: errorResponseSchema } },
			},
			429: {
				description: "Rate limit exceeded",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		const { conversationId } = c.req.valid("param")
		const { content } = c.req.valid("json")

		const { stream, userMessage, usage, isExternalProvider, provider, model } =
			await widgetService.sendMessage(clientId, conversationId, content)

		const wideEvent = c.get("wideEvent")
		if (wideEvent) {
			wideEvent.widget = {
				session_id: c.req.param("sessionId"),
				conversation_id: conversationId,
			}
			wideEvent.ai = { provider, model }
		}
		const logger = c.get("logger")
		const requestId = c.get("requestId")

		c.header("X-Accel-Buffering", "no")
		return streamSSE(c, async (sse) => {
			const keepaliveInterval = setInterval(() => {
				sse.write(":ping\n\n").catch((err) => {
					clearInterval(keepaliveInterval)
					logger.error("SSE keepalive write failed", {
						error: err instanceof Error ? err.message : String(err),
					})
				})
			}, 15000)
			let phase = "starting"
			try {
				await sse.writeSSE({
					event: "user_message",
					data: JSON.stringify(userMessage),
				})

				let fullContent = ""
				const reader = stream.getReader()
				phase = "streaming"

				try {
					while (true) {
						const { done, value } = await reader.read()
						if (done) break

						fullContent += value
						await sse.writeSSE({
							event: "token",
							data: JSON.stringify({ content: value }),
						})
					}
				} catch (err) {
					await reader.cancel().catch((cancelErr) =>
						logger.warn("Stream reader cancel failed", {
							error: String(cancelErr),
						}),
					)
					if (err instanceof BlacklistError) {
						await sse.writeSSE({
							event: "error",
							data: JSON.stringify({
								code: "BLACKLIST_TRIGGERED",
								message: "Response blocked by content filter.",
							}),
						})
					} else {
						const failure = classifyAiStreamError(err, fullContent.length > 0)
						logger.error("Widget AI stream failed", {
							code: failure.code,
							...failure.diagnostics,
							conversationId,
						})
						await sse.writeSSE({
							event: "error",
							data: JSON.stringify({
								code: failure.code,
								message: failure.message,
							}),
						})
					}
					return
				}

				phase = "usage"
				const tokensUsed = isExternalProvider ? undefined : await usage
				phase = "assistant_persistence"
				const assistantMessage = await widgetService.createAssistantMessage(
					clientId,
					conversationId,
					fullContent,
					tokensUsed,
				)

				if (tokensUsed) {
					logger.info("ai_usage", {
						request_id: requestId,
						conversation_id: conversationId,
						prompt_tokens: tokensUsed.input,
						completion_tokens: tokensUsed.output,
						total_tokens: tokensUsed.input + tokensUsed.output,
					})
					// Fire-and-forget — done event ships regardless of billing outcome
					widgetService
						.recordUsageAndAlert(clientId, assistantMessage.id, tokensUsed)
						.catch((recordErr) => {
							logger.error("Usage recording failed", {
								error:
									recordErr instanceof Error
										? recordErr.message
										: String(recordErr),
								conversationId,
							})
							Sentry.withScope((scope) => {
								scope.setTag("request_id", requestId)
								scope.setTag("conversation_id", conversationId)
								Sentry.captureException(recordErr)
							})
						})
				}

				phase = "done"
				await sse.writeSSE({
					event: "done",
					data: JSON.stringify(assistantMessage),
				})
			} catch (err) {
				logger.error("Widget SSE unexpected error", {
					error: err instanceof Error ? err.message : String(err),
					conversationId,
					phase,
				})
				const responseNotSaved = phase === "assistant_persistence"
				await sse.writeSSE({
					event: "error",
					data: JSON.stringify({
						code: responseNotSaved ? "RESPONSE_NOT_SAVED" : "INTERNAL_ERROR",
						message: responseNotSaved
							? "The response could not be saved. Please try again."
							: "The chat service is temporarily unavailable. Please try again shortly.",
					}),
				})
			} finally {
				clearInterval(keepaliveInterval)
			}
		})
	},
)

// ─── Widget config routes ──────────────────────────────────────────────────────

export const widgetConfigRoutes = createRouter<{ Variables: AppVariables }>()

widgetConfigRoutes.openapi(
	createRoute({
		method: "get",
		path: "/config",
		tags: ["Widget"],
		summary: "Get widget visual configuration",
		security: [{ widgetToken: [] }],
		responses: {
			200: {
				description: "Widget visual configuration",
				content: {
					"application/json": {
						schema: successResponseSchema(widgetVisualConfigSchema),
					},
				},
			},
		},
	}),
	async (c) => {
		const clientId = c.get("clientId")
		const config = await widgetConfigService.getConfig(clientId)
		c.header(
			"Cache-Control",
			"public, max-age=3600, stale-while-revalidate=86400",
		)
		c.header("Vary", "X-Widget-Token")
		return c.json(config, 200)
	},
)
