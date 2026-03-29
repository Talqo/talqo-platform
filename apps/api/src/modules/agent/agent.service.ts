import { generateText, stepCountIs } from "ai";
import { checkBlacklist } from "./agent.blacklist";
import { connectMcpServers } from "./agent.mcp";
import { createLanguageModel } from "./agent.provider";
import { createContextTools } from "./agent.tools";
import type { AiServiceInput, AiServiceOutput } from "./agent.types";

export async function generateResponse(
	input: AiServiceInput,
): Promise<AiServiceOutput> {
	const model = createLanguageModel(input.provider);
	const fileTools = createContextTools(input.contextDirectory);
	const mcpConnection = await connectMcpServers(input.mcpServers);

	try {
		const result = await generateText({
			model,
			system: input.context,
			prompt: input.userMessage,
			tools: {
				...fileTools,
				...mcpConnection.tools,
			},
			stopWhen: stepCountIs(input.maxSteps ?? 10),
		});

		const blocked = checkBlacklist(result.text, input.wordBlacklist);

		return {
			message: result.text,
			tokensUsed: {
				input: result.usage.inputTokens ?? 0,
				output: result.usage.outputTokens ?? 0,
				total:
					(result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0),
			},
			blocked,
		};
	} finally {
		await mcpConnection.close();
	}
}
