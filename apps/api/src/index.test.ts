import { describe, expect, it } from "bun:test";
import server from "./index";

describe("GET /health", () => {
	it("returns OK", async () => {
		const res = await server.fetch(new Request("http://localhost/health"));
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body).toEqual({ message: "OK", success: true });
	});
});

describe("unknown routes", () => {
	it("returns 404", async () => {
		const res = await server.fetch(new Request("http://localhost/unknown"));

		expect(res.status).toBe(404);
	});
});
