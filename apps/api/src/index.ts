import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ApiResponse } from "shared";
import { adminAuth } from "./middleware/admin-auth";
import { clientAuth } from "./middleware/client-auth";
import { widgetAuth } from "./middleware/widget-auth";
import adminAnalytics from "./routes/admin/analytics";
import adminAuthRouter from "./routes/admin/auth";
import adminClients from "./routes/admin/clients";
import adminMcp from "./routes/admin/mcp";
import auth from "./routes/auth";
import account from "./routes/client/account";
import analytics from "./routes/client/analytics";
import blacklist from "./routes/client/blacklist";
import botConfig from "./routes/client/bot-config";
import clientMcp from "./routes/client/mcp";
import conversations from "./routes/widget/conversations";
import messages from "./routes/widget/messages";
import sessions from "./routes/widget/sessions";

const app = new Hono();

app.use("/*", cors());

app.get("/", (c) => {
	return c.text("pb138 API");
});

app.get("/health", (c) => {
	const response: ApiResponse = {
		message: "OK",
		success: true,
	};
	return c.json(response, 200);
});

// Client auth
app.route("/auth", auth);

// Client dashboard (protected)
app.use("/client/*", clientAuth);
app.route("/client", account);
app.route("/client/me/bot-config", botConfig);
app.route("/client/me/blacklist", blacklist);
app.route("/client/me/mcp", clientMcp);
app.route("/client/me/analytics", analytics);

// Widget (protected by widget token)
app.use("/widget/*", widgetAuth);
app.route("/widget/:clientId/sessions", sessions);
app.route("/widget/:clientId/sessions/:sessionId/conversations", conversations);
app.route(
	"/widget/:clientId/sessions/:sessionId/conversations/:conversationId/messages",
	messages,
);

// Admin
app.route("/admin/auth", adminAuthRouter);
app.use("/admin/*", adminAuth);
app.route("/admin/clients", adminClients);
app.route("/admin/analytics", adminAnalytics);
app.route("/admin/mcp/pre-made", adminMcp);

export default {
	port: Number.parseInt(process.env.API_PORT ?? "3000", 10),
	fetch: app.fetch,
};
