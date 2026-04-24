import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { client } from "../client"

export function useBotConfig() {
	return useQuery({
		queryKey: ["bot-config"],
		queryFn: async () => {
			const { data, error } = await client.GET("/client/me/bot-config", {})
			if (error) throw error
			return data
		},
	})
}

export function useUpdateBotConfig() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (body: {
			systemPrompt?: string | null
			defaultRole?: string | null
			toneStyle?: string | null
			internetSearchEnabled?: boolean
		}) => {
			const { data, error } = await client.PATCH("/client/me/bot-config", {
				body,
			})
			if (error) throw error
			return data
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["bot-config"] }),
	})
}
