import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AiServiceInput } from "./agent.types";

const mockGenerateText = mock(async (_opts: unknown) => ({
	text: "Hello from AI",
	usage: { inputTokens: 10, outputTokens: 20 },
}));

const mockStepCountIs = mock((_n: number) => ({ type: "stepCount" as const }));

mock.module("ai", () => ({
	generateText: mockGenerateText,
	stepCountIs: mockStepCountIs,
	// passthrough: tools are never invoked because generateText is mocked
	tool: (config: unknown) => config,
}));

// Mock at the external package level so the real connectMcpServers and createContextTools modules are not poisoned for other test files.
const mockClose = mock(async () => {});
const mockCreateMCPClient = mock(async () => ({
	tools: mock(async () => ({})),
	close: mockClose,
}));

mock.module("@ai-sdk/mcp", () => ({
	createMCPClient: mockCreateMCPClient,
}));

import { generateResponse } from "./agent.service";

let tempDir: string;
let baseInput: AiServiceInput;

describe("generateResponse", () => {
	beforeEach(async () => {
		// Create a real temp directory for context (required by realpath in createContextTools)
		tempDir = await mkdtemp(join(tmpdir(), "agent-service-test-"));
		// Create a subdirectory for tests that expect a context directory
		const contextDir = join(tempDir, "context");
		await mkdir(contextDir);

		baseInput = {
			userMessage: "Hello",
			context: "You are a helpful assistant",
			wordBlacklist: [],
			mcpServers: [],
			contextDirectory: contextDir,
			provider: {
				baseUrl: "https://api.example.com",
				apiKey: "test-key",
				model: "gpt-4",
			},
		};

		mockGenerateText.mockClear();
		mockStepCountIs.mockClear();
		mockClose.mockClear();
		mockCreateMCPClient.mockClear();
	});

	afterEach(async () => {
		// Clean up temp directory
		await rm(tempDir, { recursive: true, force: true });
	});

	it("returns message and token usage on success", async () => {
		const result = await generateResponse(baseInput);
		expect(result.message).toBe("Hello from AI");
		expect(result.tokensUsed).toEqual({ input: 10, output: 20 });
	});

	it("returns blocked=false when no blacklisted words match", async () => {
		const result = await generateResponse({
			...baseInput,
			wordBlacklist: ["forbidden"],
		});
		expect(result.blocked).toBe(false);
	});

	it("returns blocked=true when the response contains a blacklisted word", async () => {
		mockGenerateText.mockResolvedValueOnce({
			text: "I cannot help with that forbidden request",
			usage: { inputTokens: 5, outputTokens: 10 },
		});
		const result = await generateResponse({
			...baseInput,
			wordBlacklist: ["forbidden"],
		});
		expect(result.blocked).toBe(true);
	});

	it("closes the MCP connection even when generateText throws", async () => {
		mockGenerateText.mockRejectedValueOnce(new Error("model error"));
		const error = await generateResponse({
			...baseInput,
			mcpServers: [{ type: "sse", url: "http://example.com" }],
		}).catch((e: unknown) => e);
		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toBe("model error");
		expect(mockClose).toHaveBeenCalledTimes(1);
	});

	it("uses maxSteps=10 by default", async () => {
		await generateResponse(baseInput);
		expect(mockStepCountIs).toHaveBeenCalledWith(10);
	});

	it("passes a custom maxSteps to the stop condition", async () => {
		await generateResponse({ ...baseInput, maxSteps: 3 });
		expect(mockStepCountIs).toHaveBeenCalledWith(3);
	});

	it("passes system context and user message to generateText", async () => {
		await generateResponse(baseInput);
		const opts = mockGenerateText.mock.calls[0][0] as {
			system: string;
			prompt: string;
		};
		expect(opts.system).toBe("You are a helpful assistant");
		expect(opts.prompt).toBe("Hello");
	});
});
