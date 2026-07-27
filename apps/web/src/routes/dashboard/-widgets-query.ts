import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

export interface Widget {
	id: string;
	name: string;
	status: "active" | "paused";
	systemPrompt: string;
	wordBlacklist: string[];
}

const MOCK_WIDGETS: Widget[] = [
	{
		id: "bot-1",
		name: "Support Bot",
		status: "active",
		systemPrompt:
			"You are a helpful customer support assistant for a SaaS product.",
		wordBlacklist: ["spam", "abuse"],
	},
	{
		id: "bot-2",
		name: "Sales Assistant",
		status: "active",
		systemPrompt:
			"You are a friendly sales assistant that helps visitors choose the right plan.",
		wordBlacklist: ["scam"],
	},
	{
		id: "bot-3",
		name: "FAQ Bot",
		status: "paused",
		systemPrompt:
			"You answer frequently asked questions from the knowledge base.",
		wordBlacklist: [],
	},
];

async function fetchWidgets(): Promise<Widget[]> {
	try {
		return await apiClient.get<Widget[]>("/widgets");
	} catch {
		return MOCK_WIDGETS;
	}
}

export function useWidgets() {
	return useQuery({
		queryKey: ["widgets"],
		queryFn: fetchWidgets,
	});
}
