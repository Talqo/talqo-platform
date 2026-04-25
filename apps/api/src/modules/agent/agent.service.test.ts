import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { AiServiceInput } from "./agent.types"

const mockGenerateText = mock(async (_opts: unknown) => ({
	text: "Hello from AI",
	usage: { inputTokens: 10, outputTokens: 20 },
}))

const mockStepCountIs = mock((_n: number) => ({ type: "stepCount" as const }))

let mockStreamChunks: string[] = []

function makeMockReader(chunks: string[]) {
	const remaining = [...chunks]
	return {
		read: mock(async () => {
			if (remaining.length === 0) {
				return { value: undefined, done: true }
			}
			const chunk = remaining.shift()
			return { value: chunk, done: false }
		}),
		releaseLock: mock(() => {}),
		cancel: mock(async () => {}),
	}
}

const mockUsage = Promise.resolve({ inputTokens: 5, outputTokens: 10 })

const mockStreamText = mock((_opts: unknown) => {
	return {
		textStream: {
			getReader: () => makeMockReader(mockStreamChunks),
		},
		fullStream: {
			[Symbol.asyncIterator]: mock(async function* () {
				for (const chunk of mockStreamChunks)
					yield { type: "text-delta", text: chunk }
			}),
		},
		consumeStream: mock(async () => {}),
		usage: mockUsage,
	}
})

mock.module("ai", () => ({
	generateText: mockGenerateText,
	streamText: mockStreamText,
	stepCountIs: mockStepCountIs,
	tool: (config: unknown) => config,
}))

const mockClose = mock(async () => {})
const mockCreateMCPClient = mock(async () => ({
	tools: mock(async () => ({})),
	close: mockClose,
}))

mock.module("@ai-sdk/mcp", () => ({
	createMCPClient: mockCreateMCPClient,
}))

const { generateResponse, streamResponse } = await import("./agent.service")

let tempDir: string
let baseInput: AiServiceInput

describe("generateResponse", () => {
	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "agent-service-test-"))
		const contextDir = join(tempDir, "context")
		await mkdir(contextDir)

		baseInput = {
			userMessage: "Hello",
			context: "You are a helpful assistant",
			wordBlacklist: [],
			mcpServers: [],
			contextDirectory: contextDir,
			provider: {
				type: "openai_compatible" as const,
				baseURL: "https://api.example.com",
				apiKey: "test-key",
				model: "gpt-4",
			},
		}

		mockGenerateText.mockClear()
		mockStepCountIs.mockClear()
		mockClose.mockClear()
		mockCreateMCPClient.mockClear()
	})

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true })
	})

	it("returns message and token usage on success", async () => {
		const result = await generateResponse(baseInput)
		expect(result.message).toBe("Hello from AI")
		expect(result.tokensUsed).toEqual({ input: 10, output: 20 })
	})

	it("returns blocked=false when no blacklisted words match", async () => {
		const result = await generateResponse({
			...baseInput,
			wordBlacklist: ["forbidden"],
		})
		expect(result.blocked).toBe(false)
	})

	it("returns blocked=true when the response contains a blacklisted word", async () => {
		mockGenerateText.mockResolvedValueOnce({
			text: "I cannot help with that forbidden request",
			usage: { inputTokens: 5, outputTokens: 10 },
		})
		const result = await generateResponse({
			...baseInput,
			wordBlacklist: ["forbidden"],
		})
		expect(result.blocked).toBe(true)
	})

	it("closes the MCP connection even when generateText throws", async () => {
		mockGenerateText.mockRejectedValueOnce(new Error("model error"))
		const error = await generateResponse({
			...baseInput,
			mcpServers: [{ type: "sse", url: "http://example.com" }],
		}).catch((e: unknown) => e)
		expect(error).toBeInstanceOf(Error)
		expect((error as Error).message).toBe("model error")
		expect(mockClose).toHaveBeenCalledTimes(1)
	})

	it("uses maxSteps=10 by default", async () => {
		await generateResponse(baseInput)
		expect(mockStepCountIs).toHaveBeenCalledWith(10)
	})

	it("passes a custom maxSteps to the stop condition", async () => {
		await generateResponse({ ...baseInput, maxSteps: 3 })
		expect(mockStepCountIs).toHaveBeenCalledWith(3)
	})

	it("passes system context and user message to generateText", async () => {
		await generateResponse(baseInput)
		const opts = mockGenerateText.mock.calls[0][0] as {
			system: string
			prompt: string
		}
		expect(opts.system).toBe("You are a helpful assistant")
		expect(opts.prompt).toBe("Hello")
	})
})

describe("streamResponse", () => {
	beforeEach(async () => {
		// Create a real temp directory for context (required by realpath in createContextTools)
		tempDir = await mkdtemp(join(tmpdir(), "agent-service-test-"))
		const contextDir = join(tempDir, "context")
		await mkdir(contextDir)

		baseInput = {
			userMessage: "Hello",
			context: "You are a helpful assistant",
			wordBlacklist: [],
			mcpServers: [],
			contextDirectory: contextDir,
			provider: {
				type: "openai_compatible" as const,
				baseURL: "https://api.example.com",
				apiKey: "test-key",
				model: "gpt-4",
			},
		}

		mockStreamChunks = ["Hello", " from", " AI"]
		mockStreamText.mockClear()
		mockClose.mockClear()
		mockCreateMCPClient.mockClear()
	})

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true })
	})

	it("returns a ReadableStream that yields token chunks", async () => {
		const { stream } = await streamResponse(baseInput)
		const reader = stream.getReader()
		const chunks: string[] = []
		while (true) {
			const { value, done } = await reader.read()
			if (done) break
			chunks.push(value)
		}
		expect(chunks).toEqual(["Hello", " from", " AI"])
	})

	it("passes history as messages to streamText", async () => {
		await streamResponse({
			...baseInput,
			history: [
				{ role: "user", content: "previous question" },
				{ role: "assistant", content: "previous answer" },
			],
		})
		const opts = mockStreamText.mock.calls[0][0] as {
			messages: { role: string; content: string }[]
		}
		expect(opts.messages).toHaveLength(3)
		expect(opts.messages[0]).toEqual({
			role: "user",
			content: "previous question",
		})
		expect(opts.messages[1]).toEqual({
			role: "assistant",
			content: "previous answer",
		})
		expect(opts.messages[2]).toEqual({
			role: "user",
			content: baseInput.userMessage,
		})
	})

	it("closes MCP connection when stream completes", async () => {
		const { stream } = await streamResponse({
			...baseInput,
			mcpServers: [{ type: "sse", url: "http://example.com" }],
		})
		const reader = stream.getReader()
		while (true) {
			const { done } = await reader.read()
			if (done) break
		}
		expect(mockClose).toHaveBeenCalledTimes(1)
	})

	it("closes MCP connection when stream is cancelled", async () => {
		const { stream } = await streamResponse({
			...baseInput,
			mcpServers: [{ type: "sse", url: "http://example.com" }],
		})
		const reader = stream.getReader()
		await reader.cancel()
		expect(mockClose).toHaveBeenCalledTimes(1)
	})

	it("works with empty contextDirectory (returns no tools)", async () => {
		const { stream } = await streamResponse({
			...baseInput,
			contextDirectory: "",
		})
		const reader = stream.getReader()
		const chunks: string[] = []
		while (true) {
			const { value, done } = await reader.read()
			if (done) break
			chunks.push(value)
		}
		expect(chunks).toEqual(["Hello", " from", " AI"])
	})
})
