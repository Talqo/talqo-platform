import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export interface Widget {
	id: string;
	name: string;
	status: "active" | "paused";
	systemPrompt: string;
	wordBlacklist: string[];
}

// Mock data until the /widgets API endpoint exists.
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

export function useWidgets() {
	return useQuery({
		queryKey: ["widgets"],
		queryFn: () => Promise.resolve(MOCK_WIDGETS),
		staleTime: Number.POSITIVE_INFINITY,
	});
}

export function useActiveWidget() {
	const { data: widgets, isLoading } = useWidgets();
	const [selectedId, setSelectedId] = useState("");
	const activeId = selectedId || widgets?.[0]?.id || "";
	return { widgets, isLoading, activeId, setSelectedId };
}
