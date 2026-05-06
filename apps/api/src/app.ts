import { OpenAPIHono } from "@hono/zod-openapi"
import { Scalar } from "@scalar/hono-api-reference"
import { cors } from "hono/cors"
import type { AppVariables } from "./common/jwt"
import { logger } from "./common/logger"
import { adminAuditLog } from "./common/middleware/admin-audit-log"
import { adminAuth } from "./common/middleware/admin-auth"
import { clientAuth } from "./common/middleware/client-auth"
import { errorHandler } from "./common/middleware/error-handler"
import { requestLogger } from "./common/middleware/request-logger"
import { widgetAuth } from "./common/middleware/widget-auth"
import {
	adminActivityLogsRoutes,
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
import { filesRoutes } from "./modules/files"
import { adminMcpRoutes, clientMcpRoutes } from "./modules/mcp"
import { providerConfigRoutes } from "./modules/provider-config"
import {
	widgetConversationRoutes,
	widgetMessageRoutes,
	widgetSessionRoutes,
} from "./modules/widget"

const app = new OpenAPIHono<{ Variables: AppVariables }>()
const v1 = new OpenAPIHono<{ Variables: AppVariables }>()

app.use("/*", cors())
app.use("/*", async (c, next) => {
	c.set("logger", logger.withContext({ requestId: crypto.randomUUID() }))
	await next()
})
app.use("/*", requestLogger)
app.onError(errorHandler)

app.get("/", (c) => c.text("PagePal API"))

app.get("/health", (c) => {
	return c.json({ message: "OK" }, 200)
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

// ─── Widget API (protected by widget token) ───────────────────────────────────
v1.use("/widget/*", widgetAuth)
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
v1.use("/admin/*", adminAuditLog)
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
		title: "PagePal API",
		version: "1.0.0",
		description: "REST API for the PagePal embeddable AI chat widget platform",
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
