import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test"
import { Hono } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import type { AppVariables } from "../jwt"
import { logger } from "../logger"
import { wideEventMiddleware } from "./wide-event"

function buildApp(status: ContentfulStatusCode = 200) {
	const app = new Hono<{ Variables: AppVariables }>()
	app.use("/*", async (c, next) => {
		const requestId = crypto.randomUUID()
		c.set("requestId", requestId)
		c.set("logger", logger.withContext({ requestId }))
		await next()
	})
	app.use("/*", wideEventMiddleware)
	app.get("/test", (c) => c.text("ok", status))
	return app
}

describe("wideEventMiddleware", () => {
	let stdoutSpy: ReturnType<typeof spyOn<typeof process.stdout, "write">>

	beforeEach(() => {
		stdoutSpy = spyOn(process.stdout, "write").mockImplementation(() => true)
	})

	afterEach(() => {
		stdoutSpy.mockRestore()
	})

	function parseEntry(): Record<string, unknown> {
		const call = stdoutSpy.mock.calls[0] as [string]
		return JSON.parse(call[0])
	}

	it("logs one entry per request", async () => {
		await buildApp().fetch(new Request("http://localhost/test"))
		expect(stdoutSpy).toHaveBeenCalledTimes(1)
	})

	it("sets message to 'wide_event'", async () => {
		await buildApp().fetch(new Request("http://localhost/test"))
		expect(parseEntry().message).toBe("wide_event")
	})

	it("logs correct method and path", async () => {
		await buildApp().fetch(new Request("http://localhost/test"))
		const entry = parseEntry()
		expect(entry.method).toBe("GET")
		expect(entry.path).toBe("/test")
	})

	it("logs the response status_code", async () => {
		await buildApp(201).fetch(new Request("http://localhost/test"))
		expect(parseEntry().status_code).toBe(201)
	})

	it("logs duration_ms as a non-negative number", async () => {
		await buildApp().fetch(new Request("http://localhost/test"))
		const { duration_ms } = parseEntry()
		expect(typeof duration_ms).toBe("number")
		expect(duration_ms as number).toBeGreaterThanOrEqual(0)
	})
})
