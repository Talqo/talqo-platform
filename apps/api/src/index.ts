import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ApiResponse } from "shared";

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

export default {
	port: 3000,
	fetch: app.fetch,
};
