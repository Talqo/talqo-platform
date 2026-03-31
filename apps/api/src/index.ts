import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ApiResponse } from "shared";
import { authRouter } from "./modules/auth";

const app = new Hono();

app.use("/*", cors());

app.onError((err, c) => {
	console.error(err);
	const response: ApiResponse = {
		success: false,
		message: "Internal server error",
	};
	return c.json(response, 500);
});

app.route("/auth", authRouter);

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
	port: Number.parseInt(process.env.API_PORT ?? "3000", 10),
	fetch: app.fetch,
};
