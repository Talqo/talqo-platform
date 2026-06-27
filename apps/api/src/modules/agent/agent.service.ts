import type { ModelMessage } from "ai"
import { stepCountIs, streamText } from "ai"
import { estimateTokens } from "@/common/billing"
import { BlacklistError } from "@/common/errors"
import { checkBlacklist } from "./agent.blacklist"
import { connectMcpServers } from "./agent.mcp"
import { createLanguageModel } from "./agent.provider"
import type { AiServiceInput, TokenUsage } from "./agent.types"

function buildPromptText(
	system: string,
	history: ModelMessage[],
	userMessage: string,
): string {
	const parts: string[] = [system]
	for (const m of history) {
		parts.push(
			typeof m.content === "string" ? m.content : JSON.stringify(m.content),
		)
	}
	parts.push(userMessage)
	return parts.join("\n")
}

export async function streamResponse(
	input: AiServiceInput,
): Promise<{ stream: ReadableStream<string>; usage: Promise<TokenUsage> }> {
	const model = createLanguageModel(input.provider)
	const mcpConnection = await connectMcpServers(input.mcpServers)

	const history: ModelMessage[] = input.history ?? []

	const result = streamText({
		model,
		system: input.context,
		messages: [...history, { role: "user", content: input.userMessage }],
		tools: mcpConnection.tools,
		stopWhen: stepCountIs(input.maxSteps ?? 10),
		onFinish: () => close(),
		onAbort: () => close(),
		onError: () => close(),
	})

	// Track output text in case the provider doesn't report token usage —
	// we'll estimate from the raw text as a fallback.
	let outputText = ""
	let resolveStreamDone: (() => void) | undefined
	const streamDonePromise = new Promise<void>((resolve) => {
		resolveStreamDone = resolve
	})

	let closed = false
	const close = async () => {
		if (closed) return
		closed = true
		await mcpConnection.close()
	}

	const stream = new ReadableStream<string>({
		async pull(controller) {
			try {
				for await (const part of result.fullStream) {
					if (part.type === "error") {
						controller.error(part.error)
						return
					}
					if (part.type === "text-delta") {
						if (checkBlacklist(part.text, input.wordBlacklist)) {
							controller.error(new BlacklistError())
							return
						}
						outputText += part.text
						controller.enqueue(part.text)
					}
				}
				controller.close()
			} catch (error) {
				controller.error(error)
			} finally {
				await close()
				resolveStreamDone?.()
			}
		},
		cancel() {
			resolveStreamDone?.()
			return close()
		},
	})

	// Resolve usage only after both the SDK reports total usage AND our
	// consumer has fully drained the stream — otherwise outputText would
	// be empty when we hit the fallback path.
	const usagePromise: Promise<TokenUsage> = (async () => {
		let reported:
			| { inputTokens?: number; outputTokens?: number; totalTokens?: number }
			| undefined
		try {
			reported = await result.totalUsage
		} catch {
			reported = undefined
		}
		await streamDonePromise

		const reportedInput = reported?.inputTokens ?? 0
		const reportedOutput = reported?.outputTokens ?? 0
		const reportedTotal = reported?.totalTokens ?? 0

		if (reportedInput > 0 && reportedOutput > 0) {
			return { input: reportedInput, output: reportedOutput }
		}

		// Provider reported only the total without the input/output split —
		// attribute to input (cheaper rate, no overcharge).
		if (reportedInput === 0 && reportedOutput === 0 && reportedTotal > 0) {
			return { input: reportedTotal, output: 0 }
		}

		// Partial: estimate whichever side is missing.
		const promptText = buildPromptText(
			input.context,
			history,
			input.userMessage,
		)
		const estimatedInput = estimateTokens(promptText)
		const estimatedOutput = estimateTokens(outputText)

		if (reportedInput === 0 && reportedOutput > 0) {
			return { input: estimatedInput, output: reportedOutput }
		}
		if (reportedInput > 0 && reportedOutput === 0) {
			return { input: reportedInput, output: estimatedOutput }
		}

		// Provider reported nothing — full estimation.
		return { input: estimatedInput, output: estimatedOutput }
	})()

	return { stream, usage: usagePromise }
}
