import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { type AppVariables, logger } from "../logger";
import { requestLogger } from "./request-logger";

function buildApp(status: ContentfulStatusCode = 200) {
	const app = new Hono<{ Variables: AppVariables }>();
	app.use("/*", async (c, next) => {
		c.set("logger", logger.withContext({ requestId: crypto.randomUUID() }));
		await next();
	});
	app.use("/*", requestLogger);
	app.get("/test", (c) => c.text("ok", status));
	return app;
}

describe("requestLogger middleware", () => {
	let stdoutSpy: ReturnType<typeof spyOn<typeof process.stdout, "write">>;

	beforeEach(() => {
		stdoutSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
	});

	afterEach(() => {
		stdoutSpy.mockRestore();
	});

	function parseEntry(): Record<string, unknown> {
		const call = stdoutSpy.mock.calls[0] as [string];
		return JSON.parse(call[0]);
	}

	it("logs one entry per request", async () => {
		await buildApp().fetch(new Request("http://localhost/test"));
		expect(stdoutSpy).toHaveBeenCalledTimes(1);
	});

	it("sets message to 'HTTP request'", async () => {
		await buildApp().fetch(new Request("http://localhost/test"));
		expect(parseEntry().message).toBe("HTTP request");
	});

	it("logs correct method and path", async () => {
		await buildApp().fetch(new Request("http://localhost/test"));
		const entry = parseEntry();
		expect(entry.method).toBe("GET");
		expect(entry.path).toBe("/test");
	});

	it("logs the response status code", async () => {
		await buildApp(201).fetch(new Request("http://localhost/test"));
		expect(parseEntry().status).toBe(201);
	});

	it("logs durationMs as a non-negative number", async () => {
		await buildApp().fetch(new Request("http://localhost/test"));
		const { durationMs } = parseEntry();
		expect(typeof durationMs).toBe("number");
		expect(durationMs as number).toBeGreaterThanOrEqual(0);
	});
});
