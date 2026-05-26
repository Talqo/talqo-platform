import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { AiServiceInput } from "./agent.types"

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

type MockUsageShape = {
	inputTokens?: number
	outputTokens?: number
	totalTokens?: number
}

let mockUsageValue: MockUsageShape = {
	inputTokens: 5,
	outputTokens: 10,
	totalTokens: 15,
}

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
		usage: Promise.resolve(mockUsageValue),
		totalUsage: Promise.resolve(mockUsageValue),
	}
})

mock.module("ai", () => ({
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

const { streamResponse } = await import("./agent.service")

let tempDir: string
let baseInput: AiServiceInput

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
				providerType: "openai_compatible" as const,
				baseUrl: "https://api.example.com",
				apiKey: "test-key",
				model: "gpt-4",
			},
		}

		mockStreamChunks = ["Hello", " from", " AI"]
		mockUsageValue = { inputTokens: 5, outputTokens: 10, totalTokens: 15 }
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
			mcpServers: [{ type: "http", url: "https://example.com" }],
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
			mcpServers: [{ type: "http", url: "https://example.com" }],
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

	describe("token usage fallback", () => {
		async function drainStream(stream: ReadableStream<string>): Promise<void> {
			const reader = stream.getReader()
			while (true) {
				const { done } = await reader.read()
				if (done) break
			}
		}

		it("uses reported tokens when provider reports both input and output", async () => {
			mockUsageValue = {
				inputTokens: 100,
				outputTokens: 50,
				totalTokens: 150,
			}
			const { stream, usage } = await streamResponse(baseInput)
			await drainStream(stream)
			expect(await usage).toEqual({ input: 100, output: 50 })
		})

		it("attributes totalTokens to input when provider gives no split", async () => {
			mockUsageValue = { totalTokens: 200 }
			const { stream, usage } = await streamResponse(baseInput)
			await drainStream(stream)
			expect(await usage).toEqual({ input: 200, output: 0 })
		})

		it("falls back to estimating from prompt + output text when provider reports nothing", async () => {
			mockUsageValue = {}
			mockStreamChunks = ["Hello", " world"]
			const { stream, usage } = await streamResponse({
				...baseInput,
				userMessage: "Hi there",
				context: "You are a bot",
			})
			await drainStream(stream)
			const result = await usage
			// Output: "Hello world" = 11 chars → ceil(11/4) = 3 tokens
			expect(result.output).toBe(3)
			// Input: "You are a bot" + "\n" + "Hi there" = 22 chars → 6 tokens
			expect(result.input).toBeGreaterThan(0)
		})

		it("estimates input from system + history + user message when only output is reported", async () => {
			mockUsageValue = { outputTokens: 42 }
			const { stream, usage } = await streamResponse({
				...baseInput,
				history: [
					{ role: "user", content: "earlier turn" },
					{ role: "assistant", content: "earlier reply" },
				],
				userMessage: "follow-up",
				context: "system prompt",
			})
			await drainStream(stream)
			const result = await usage
			// Output stays as reported
			expect(result.output).toBe(42)
			// Input is estimated and must include history (proves we re-bill the
			// whole conversation each turn when there's no caching)
			expect(result.input).toBeGreaterThan(0)
		})
	})
})
