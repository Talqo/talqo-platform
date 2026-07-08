import { Scalar } from "@scalar/hono-api-reference"
import { sql } from "drizzle-orm"
import type { Context } from "hono"
import { bodyLimit } from "hono/body-limit"
import { cors } from "hono/cors"
import { config } from "./common/config"
import type { AppVariables } from "./common/jwt"
import { logger } from "./common/logger"
import { createAdminAuditLog } from "./common/middleware/admin-audit-log"
import { adminAuth } from "./common/middleware/admin-auth"
import { clientAuth } from "./common/middleware/client-auth"
import { errorHandler } from "./common/middleware/error-handler"
import { createWideEventMiddleware } from "./common/middleware/wide-event"
import { widgetAuth } from "./common/middleware/widget-auth"
import { createRouter } from "./common/router"
import { SentryExporter } from "./common/sentry-exporter"
import { db } from "./db"
import {
	adminActivityLogsRoutes,
	adminAuditLogService,
	adminAuthRoutes,
	adminClientRoutes,
	adminConversationRoutes,
	adminMeRoutes,
} from "./modules/admin"
import {
	adminAnalyticsRoutes,
	clientAnalyticsRoutes,
} from "./modules/analytics"
import { authRoutes } from "./modules/auth"
import { blacklistRoutes } from "./modules/blacklist"
import { botConfigRoutes } from "./modules/bot-config"
import { clientAccountRoutes } from "./modules/client-account"
import { clientConversationRoutes } from "./modules/client-conversations"
import { createFilesRouter, filesService } from "./modules/files"
import { adminMcpRoutes, clientMcpRoutes } from "./modules/mcp"
import { providerConfigRoutes } from "./modules/provider-config"
import { ragService } from "./modules/rag/index"
import {
	widgetConfigRoutes,
	widgetConversationRoutes,
	widgetMessageRoutes,
	widgetSessionRoutes,
} from "./modules/widget"
import { clientWidgetConfigRoutes } from "./modules/widget-config"

const filesRoutes = createFilesRouter(filesService, ragService)

const allowedOrigins =
	config.ALLOWED_ORIGINS?.split(",")
		.map((s) => s.trim())
		.filter(Boolean) ?? []

const app = createRouter<{ Variables: AppVariables }>()
const v1 = createRouter<{ Variables: AppVariables }>()

app.use("/*", async (c, next) => {
	const requestId = crypto.randomUUID()
	c.set("requestId", requestId)
	c.set("logger", logger.withContext({ requestId }))
	await next()
})
app.use("/*", createWideEventMiddleware([new SentryExporter()]))
app.use("/*", async (c, next) => {
	await next()
	if (c.res.status === 415 || c.req.method === "PATCH") {
		c.res.headers.set("Accept-Patch", "application/json")
	}
})

// Widget routes are embedded in third-party sites — open CORS required
app.use("/v1/widget/*", cors({ origin: "*" }))

// Client dashboard and admin routes: restrict to known origins
const restrictedCors = cors({
	origin: (origin) => {
		if (!origin) return null
		if (allowedOrigins.length === 0) {
			// Allow common local dev origins when no explicit list is configured
			const isLocalDev = /^http:\/\/localhost:\d+$/.test(origin)
			return isLocalDev ? origin : null
		}
		return allowedOrigins.includes(origin) ? origin : null
	},
	credentials: true,
})
app.use("/v1/client/*", restrictedCors)
app.use("/v1/admin/*", restrictedCors)
app.use("/v1/auth/*", restrictedCors)

app.onError(errorHandler)

app.get("/", (c) => c.text("Talqo API"))

const HEALTH_CHECK_TIMEOUT_MS = 2000

app.get("/health", async (c) => {
	try {
		await Promise.race([
			db.execute(sql`SELECT 1`),
			new Promise((_, reject) =>
				setTimeout(
					() => reject(new Error("Health check DB probe timed out")),
					HEALTH_CHECK_TIMEOUT_MS,
				),
			),
		])
	} catch (err) {
		logger.error("Health check failed — database unreachable", {
			error: err instanceof Error ? err.message : String(err),
		})
		return c.json({ message: "Service Unavailable" }, 503)
	}
	return c.json({ message: "OK" }, 200)
})

// ─── Request body size limits ─────────────────────────────────────────────────
// Bun's default is 128 MB, which lets a single request allocate huge amounts of
// heap. Cap JSON routes tightly; the file upload route gets its own, larger cap.
const DEFAULT_BODY_LIMIT_BYTES = 1 * 1024 * 1024 // 1 MB
const FILE_UPLOAD_BODY_LIMIT_BYTES = 20 * 1024 * 1024 // 20 MB

function onBodyTooLarge(c: Context) {
	return c.json(
		{ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body too large" } },
		413,
	)
}

const FILE_UPLOAD_ROUTE_PREFIX = "/v1/client/me/files"

v1.use(
	"/client/me/files/*",
	bodyLimit({ maxSize: FILE_UPLOAD_BODY_LIMIT_BYTES, onError: onBodyTooLarge }),
)

const defaultBodyLimit = bodyLimit({
	maxSize: DEFAULT_BODY_LIMIT_BYTES,
	onError: onBodyTooLarge,
})
v1.use("*", async (c, next) => {
	if (
		c.req.path === FILE_UPLOAD_ROUTE_PREFIX ||
		c.req.path.startsWith(`${FILE_UPLOAD_ROUTE_PREFIX}/`)
	)
		return next()
	return defaultBodyLimit(c, next)
})

// ─── Client auth (unprotected) ────────────────────────────────────────────────
v1.route("/auth", authRoutes)

// ─── Client dashboard (protected) ────────────────────────────────────────────
v1.use("/client/*", clientAuth)
v1.route("/client", clientAccountRoutes)
v1.route("/client/me/bot-config", botConfigRoutes)
v1.route("/client/me/blacklist", blacklistRoutes)
v1.route("/client/me/mcp", clientMcpRoutes)
v1.route("/client/me/analytics", clientAnalyticsRoutes)
v1.route("/client/me/provider-config", providerConfigRoutes)
v1.route("/client/me/files", filesRoutes)
v1.route("/client/me/conversations", clientConversationRoutes)
v1.route("/client/me/widget-config", clientWidgetConfigRoutes)

// ─── Widget API (protected by widget token) ───────────────────────────────────
v1.use("/widget/*", widgetAuth)
v1.route("/widget", widgetConfigRoutes)
v1.route("/widget/sessions", widgetSessionRoutes)
v1.route("/widget/sessions/:sessionId/conversations", widgetConversationRoutes)
v1.route(
	"/widget/sessions/:sessionId/conversations/:conversationId/messages",
	widgetMessageRoutes,
)

// ─── Admin auth (unprotected) ────────────────────────────────────────────────
v1.route("/admin/auth", adminAuthRoutes)

// ─── Admin dashboard (protected) ─────────────────────────────────────────────
v1.use("/admin/*", adminAuth)
v1.use(
	"/admin/*",
	createAdminAuditLog((entry) => adminAuditLogService.insert(entry)),
)
v1.route("/admin/me", adminMeRoutes)
v1.route("/admin/clients", adminClientRoutes)
v1.route("/admin/analytics", adminAnalyticsRoutes)
v1.route("/admin/conversations", adminConversationRoutes)
v1.route("/admin/activity-logs", adminActivityLogsRoutes)
v1.route("/admin/mcp/pre-made", adminMcpRoutes)

// ─── Security scheme definitions ─────────────────────────────────────────────
v1.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
	type: "http",
	scheme: "bearer",
	bearerFormat: "JWT",
})
v1.openAPIRegistry.registerComponent("securitySchemes", "widgetToken", {
	type: "apiKey",
	in: "header",
	name: "X-Widget-Token",
})

// ─── OpenAPI spec + docs UI ───────────────────────────────────────────────────
v1.doc("/openapi.json", {
	openapi: "3.1.0",
	info: {
		title: "Talqo API",
		version: "1.0.0",
		description: "REST API for the Talqo embeddable AI chat widget platform",
	},
	servers: [{ url: "/v1" }],
	tags: [
		{ name: "Auth", description: "Client registration and login" },
		{ name: "Client Account", description: "Profile, balance, usage settings" },
		{ name: "Bot Config", description: "Chatbot configuration" },
		{ name: "Blacklist", description: "Word blacklist management" },
		{ name: "MCP", description: "MCP server management" },
		{ name: "Analytics", description: "Usage analytics" },
		{ name: "Provider Config", description: "AI provider configuration" },
		{ name: "Files", description: "File management" },
		{ name: "Widget", description: "End-user chat widget" },
		{ name: "Widget Config", description: "Widget visual configuration" },
		{ name: "Admin", description: "Platform administration" },
	],
})

// Mount after all v1 routes and doc are registered — Hono copies routes at call time
app.route("/v1", v1)

// Type cast required: @scalar/types is a transitive dep and may not resolve in all TS setups
app.get(
	"/docs",
	Scalar({ spec: { url: "/v1/openapi.json" } } as Parameters<typeof Scalar>[0]),
)

export default app
