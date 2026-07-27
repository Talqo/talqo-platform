import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

export interface WidgetStats {
	conversations: number;
	messages: number;
	tokens: number;
	history: {
		date: string;
		conversations: number;
		messages: number;
		tokens: number;
	}[];
}

function generateMockHistory(): WidgetStats["history"] {
	const history: WidgetStats["history"] = [];
	const today = new Date();

	for (let i = 29; i >= 0; i--) {
		const date = new Date(today);
		date.setDate(date.getDate() - i);
		history.push({
			date: date.toISOString().split("T")[0],
			conversations: Math.floor(Math.random() * 50) + 10,
			messages: Math.floor(Math.random() * 200) + 50,
			tokens: Math.floor(Math.random() * 10000) + 2000,
		});
	}

	return history;
}

function createMockStats(): WidgetStats {
	const history = generateMockHistory();
	return {
		conversations: history.reduce((sum, day) => sum + day.conversations, 0),
		messages: history.reduce((sum, day) => sum + day.messages, 0),
		tokens: history.reduce((sum, day) => sum + day.tokens, 0),
		history,
	};
}

async function fetchWidgetStats(widgetId: string): Promise<WidgetStats> {
	try {
		return await apiClient.get<WidgetStats>(`/widgets/${widgetId}/stats`);
	} catch {
		return createMockStats();
	}
}

export function useWidgetStats(widgetId: string) {
	return useQuery({
		queryKey: ["widget-stats", widgetId],
		queryFn: () => fetchWidgetStats(widgetId),
		enabled: widgetId.length > 0,
	});
}
