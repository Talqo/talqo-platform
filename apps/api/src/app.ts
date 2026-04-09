import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import type { ApiResponse } from "shared";
import type { AppVariables } from "./common/jwt";
import { logger } from "./common/logger";
import { adminAuth } from "./common/middleware/admin-auth";
import { clientAuth } from "./common/middleware/client-auth";
import { errorHandler } from "./common/middleware/error-handler";
import { requestLogger } from "./common/middleware/request-logger";
import { widgetAuth } from "./common/middleware/widget-auth";
import { adminAuthRoutes, adminClientRoutes } from "./modules/admin";
import {
	adminAnalyticsRoutes,
	clientAnalyticsRoutes,
} from "./modules/analytics";
import { authRoutes } from "./modules/auth";
import { blacklistRoutes } from "./modules/blacklist";
import { botConfigRoutes } from "./modules/bot-config";
import { clientAccountRoutes } from "./modules/client-account";
import { adminMcpRoutes, clientMcpRoutes } from "./modules/mcp";
import {
	widgetConversationRoutes,
	widgetMessageRoutes,
	widgetSessionRoutes,
} from "./modules/widget";

const app = new OpenAPIHono<{ Variables: AppVariables }>();

app.use("/*", cors());
app.use("/*", async (c, next) => {
	c.set("logger", logger.withContext({ requestId: crypto.randomUUID() }));
	await next();
});
app.use("/*", requestLogger);
app.onError(errorHandler);

app.get("/", (c) => c.text("PagePal API"));

app.get("/health", (c) => {
	const response: ApiResponse = { message: "OK", success: true };
	return c.json(response, 200);
});

// ─── Client auth (unprotected) ────────────────────────────────────────────────
app.route("/auth", authRoutes);

// ─── Client dashboard (protected) ────────────────────────────────────────────
app.use("/client/*", clientAuth);
app.route("/client", clientAccountRoutes);
app.route("/client/me/bot-config", botConfigRoutes);
app.route("/client/me/blacklist", blacklistRoutes);
app.route("/client/me/mcp", clientMcpRoutes);
app.route("/client/me/analytics", clientAnalyticsRoutes);

// ─── Widget API (protected by widget token) ───────────────────────────────────
app.use("/widget/*", widgetAuth);
app.route("/widget/:clientId/sessions", widgetSessionRoutes);
app.route(
	"/widget/:clientId/sessions/:sessionId/conversations",
	widgetConversationRoutes,
);
app.route(
	"/widget/:clientId/sessions/:sessionId/conversations/:conversationId/messages",
	widgetMessageRoutes,
);

// ─── Admin auth (unprotected) ────────────────────────────────────────────────
app.route("/admin/auth", adminAuthRoutes);

// ─── Admin dashboard (protected) ─────────────────────────────────────────────
app.use("/admin/*", adminAuth);
app.route("/admin/clients", adminClientRoutes);
app.route("/admin/analytics", adminAnalyticsRoutes);
app.route("/admin/mcp/pre-made", adminMcpRoutes);

// ─── Security scheme definitions ─────────────────────────────────────────────
app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
	type: "http",
	scheme: "bearer",
	bearerFormat: "JWT",
});
app.openAPIRegistry.registerComponent("securitySchemes", "widgetToken", {
	type: "apiKey",
	in: "header",
	name: "X-Widget-Token",
});

// ─── OpenAPI spec + docs UI ───────────────────────────────────────────────────
app.doc("/openapi.json", {
	openapi: "3.1.0",
	info: {
		title: "PagePal API",
		version: "1.0.0",
		description: "REST API for the PagePal embeddable AI chat widget platform",
	},
	tags: [
		{ name: "Auth", description: "Client registration and login" },
		{ name: "Client Account", description: "Profile, balance, usage settings" },
		{ name: "Bot Config", description: "Chatbot configuration" },
		{ name: "Blacklist", description: "Word blacklist management" },
		{ name: "MCP", description: "MCP server management" },
		{ name: "Analytics", description: "Usage analytics" },
		{ name: "Widget", description: "End-user chat widget" },
		{ name: "Admin", description: "Platform administration" },
	],
});

// Type cast required: @scalar/types is a transitive dep and may not resolve in all TS setups
app.get(
	"/docs",
	Scalar({ spec: { url: "/openapi.json" } } as Parameters<typeof Scalar>[0]),
);

export default app;
