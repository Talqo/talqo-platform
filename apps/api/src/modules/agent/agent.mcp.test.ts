import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { ToolSet } from "ai";
import type { McpServerConfig } from "shared";

// Stable mock — defined before static imports so mock.module() applies when agent.mcp.ts loads
const mockCreateMCPClient = mock(async (_opts: unknown) => makeMockClient());

mock.module("@ai-sdk/mcp", () => ({
	createMCPClient: mockCreateMCPClient,
}));

mock.module("@ai-sdk/mcp/mcp-stdio", () => ({
	Experimental_StdioMCPTransport: class MockStdioTransport {
		constructor(public config: unknown) {}
	},
}));

import { connectMcpServers } from "./agent.mcp";

function makeMockClient(tools: ToolSet = {}) {
	return {
		tools: mock(async () => tools),
		close: mock(async () => {}),
	};
}

describe("connectMcpServers", () => {
	beforeEach(() => {
		mockCreateMCPClient.mockClear();
	});

	it("returns empty tools and no-op close for an empty config list", async () => {
		const conn = await connectMcpServers([]);
		expect(mockCreateMCPClient).not.toHaveBeenCalled();
		expect(Object.keys(conn.tools)).toHaveLength(0);
		await expect(conn.close()).resolves.toBeUndefined();
	});

	it("connects a stdio server and exposes its tools", async () => {
		const client = makeMockClient({ myTool: {} as never });
		mockCreateMCPClient.mockResolvedValueOnce(client);

		const config: McpServerConfig = {
			type: "stdio",
			command: "npx",
			args: ["-y", "some-mcp-server"],
			env: { API_KEY: "secret" },
		};
		const conn = await connectMcpServers([config]);

		expect(mockCreateMCPClient).toHaveBeenCalledTimes(1);
		// stdio transport is a class instance, not a plain object — verify it was passed
		const { transport } = mockCreateMCPClient.mock.calls[0][0] as {
			transport: unknown;
		};
		expect(transport).toBeDefined();
		// plain SSE/HTTP transport objects carry a "type" field; stdio instances do not
		expect((transport as Record<string, unknown>).type).toBeUndefined();
		expect(conn.tools).toHaveProperty("myTool");
	});

	it("connects an SSE server with the correct transport shape", async () => {
		mockCreateMCPClient.mockResolvedValueOnce(makeMockClient());

		const config: McpServerConfig = {
			type: "sse",
			url: "https://example.com/sse",
			headers: { Authorization: "Bearer token" },
		};
		await connectMcpServers([config]);

		const { transport } = mockCreateMCPClient.mock.calls[0][0] as {
			transport: unknown;
		};
		expect(transport).toEqual({
			type: "sse",
			url: "https://example.com/sse",
			headers: { Authorization: "Bearer token" },
		});
	});

	it("connects an HTTP server with the correct transport shape", async () => {
		mockCreateMCPClient.mockResolvedValueOnce(makeMockClient());

		const config: McpServerConfig = {
			type: "http",
			url: "https://example.com/mcp",
		};
		await connectMcpServers([config]);

		const { transport } = mockCreateMCPClient.mock.calls[0][0] as {
			transport: unknown;
		};
		expect(transport).toEqual({ type: "http", url: "https://example.com/mcp" });
	});

	it("merges tools from multiple servers", async () => {
		mockCreateMCPClient
			.mockResolvedValueOnce(makeMockClient({ toolA: {} as never }))
			.mockResolvedValueOnce(makeMockClient({ toolB: {} as never }));

		const configs: McpServerConfig[] = [
			{ type: "sse", url: "https://server1.com" },
			{ type: "sse", url: "https://server2.com" },
		];
		const conn = await connectMcpServers(configs);

		expect(conn.tools).toHaveProperty("toolA");
		expect(conn.tools).toHaveProperty("toolB");
	});

	it("skips a failed server, logs the error, and connects the rest", async () => {
		mockCreateMCPClient
			.mockRejectedValueOnce(new Error("connection refused"))
			.mockResolvedValueOnce(makeMockClient({ toolB: {} as never }));

		const stderrSpy = spyOn(process.stderr, "write").mockImplementation(
			() => true,
		);

		const configs: McpServerConfig[] = [
			{ type: "sse", url: "https://broken.com" },
			{ type: "sse", url: "https://working.com" },
		];
		const conn = await connectMcpServers(configs);

		expect(stderrSpy).toHaveBeenCalledTimes(1);
		expect(conn.tools).not.toHaveProperty("toolA");
		expect(conn.tools).toHaveProperty("toolB");

		stderrSpy.mockRestore();
	});

	it("calls close on all connected clients", async () => {
		const client1 = makeMockClient();
		const client2 = makeMockClient();
		mockCreateMCPClient
			.mockResolvedValueOnce(client1)
			.mockResolvedValueOnce(client2);

		const conn = await connectMcpServers([
			{ type: "sse", url: "https://server1.com" },
			{ type: "sse", url: "https://server2.com" },
		]);
		await conn.close();

		expect(client1.close).toHaveBeenCalledTimes(1);
		expect(client2.close).toHaveBeenCalledTimes(1);
	});

	it("does not throw if a client fails to close", async () => {
		const client = {
			tools: mock(async () => ({}) as ToolSet),
			close: mock(async () => {
				throw new Error("close error");
			}),
		};
		mockCreateMCPClient.mockResolvedValueOnce(client);

		const conn = await connectMcpServers([
			{ type: "sse", url: "https://example.com" },
		]);
		// Promise.allSettled absorbs individual close failures
		await expect(conn.close()).resolves.toBeUndefined();
	});
});
