import { useQuery } from "@tanstack/react-query"
import { client } from "../client"

type AnalyticsQuery = {
	from?: string
	to?: string
	granularity?: "day" | "week" | "month"
}

export function useTokenAnalytics(query: AnalyticsQuery = {}) {
	return useQuery({
		queryKey: ["analytics", "tokens", query],
		queryFn: async () => {
			const { data, error } = await client.GET("/client/me/analytics/tokens", {
				params: { query },
			})
			if (error) throw error
			return data
		},
	})
}

export function useMessageAnalytics(query: AnalyticsQuery = {}) {
	return useQuery({
		queryKey: ["analytics", "messages", query],
		queryFn: async () => {
			const { data, error } = await client.GET(
				"/client/me/analytics/messages",
				{
					params: { query },
				},
			)
			if (error) throw error
			return data
		},
	})
}
