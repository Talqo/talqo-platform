import type { ModelMessage } from "ai"
import { stepCountIs, streamText } from "ai"
import { BlacklistError } from "@/common/errors"
import { checkBlacklist } from "./agent.blacklist"
import { connectMcpServers } from "./agent.mcp"
import { createLanguageModel } from "./agent.provider"
import { createContextTools } from "./agent.tools"
import type { AiServiceInput, TokenUsage } from "./agent.types"

export async function streamResponse(
	input: AiServiceInput,
): Promise<{ stream: ReadableStream<string>; usage: Promise<TokenUsage> }> {
	const model = createLanguageModel(input.provider)
	const fileTools = await createContextTools(input.contextDirectory)
	const mcpConnection = await connectMcpServers(input.mcpServers)

	const history: ModelMessage[] = input.history ?? []

	const result = streamText({
		model,
		system: input.context,
		messages: [...history, { role: "user", content: input.userMessage }],
		tools: {
			...fileTools,
			...mcpConnection.tools,
		},
		stopWhen: stepCountIs(input.maxSteps ?? 10),
		onFinish: () => mcpConnection.close(),
		onAbort: () => mcpConnection.close(),
		onError: () => mcpConnection.close(),
	})

	const usagePromise: Promise<TokenUsage> = Promise.resolve(result.usage).then(
		(u) => ({ input: u.inputTokens ?? 0, output: u.outputTokens ?? 0 }),
		() => ({ input: 0, output: 0 }),
	)

	let closed = false

	const close = async () => {
		if (closed) return
		closed = true
		await mcpConnection.close()
	}

	// fullStream preserves error parts from the SDK; textStream silently drops them
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
						controller.enqueue(part.text)
					}
				}
				controller.close()
			} catch (error) {
				controller.error(error)
			} finally {
				await close()
			}
		},
		cancel() {
			return close()
		},
	})

	return { stream, usage: usagePromise }
}
