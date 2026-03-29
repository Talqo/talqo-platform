import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { AiServiceInput } from "./agent.types";

// --- stable mocks (defined before mock.module so they can be referenced in factory fns) ---

const mockMcpClose = mock(async () => {});

const mockGenerateText = mock(async (_opts: unknown) => ({
	text: "Hello from AI",
	usage: { inputTokens: 10, outputTokens: 20 },
}));

const mockStepCountIs = mock((_n: number) => ({ type: "stepCount" as const }));

mock.module("ai", () => ({
	generateText: mockGenerateText,
	stepCountIs: mockStepCountIs,
}));

mock.module("./agent.provider", () => ({
	createLanguageModel: mock(() => ({ type: "mock-model" })),
}));

mock.module("./agent.mcp", () => ({
	connectMcpServers: mock(async (_configs: unknown) => ({
		tools: {},
		close: mockMcpClose,
	})),
}));

mock.module("./agent.tools", () => ({
	createContextTools: mock(() => ({})),
}));

// imported after mock.module calls so the mocked dependencies are in place
import { generateResponse } from "./agent.service";

const baseInput: AiServiceInput = {
	userMessage: "Hello",
	context: "You are a helpful assistant",
	wordBlacklist: [],
	mcpServers: [],
	contextDirectory: "/tmp/context",
	provider: {
		baseUrl: "https://api.example.com",
		apiKey: "test-key",
		model: "gpt-4",
	},
};

describe("generateResponse", () => {
	beforeEach(() => {
		mockGenerateText.mockClear();
		mockStepCountIs.mockClear();
		mockMcpClose.mockClear();
	});

	it("returns message and token usage on success", async () => {
		const result = await generateResponse(baseInput);
		expect(result.message).toBe("Hello from AI");
		expect(result.tokensUsed).toEqual({ input: 10, output: 20, total: 30 });
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
		await expect(generateResponse(baseInput)).rejects.toThrow("model error");
		expect(mockMcpClose).toHaveBeenCalledTimes(1);
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
