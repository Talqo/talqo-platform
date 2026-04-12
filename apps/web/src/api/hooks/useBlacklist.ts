import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { client } from "../client"

export function useBlacklist() {
	return useQuery({
		queryKey: ["blacklist"],
		queryFn: async () => {
			const { data, error } = await client.GET("/client/me/blacklist", {})
			if (error) throw error
			return data.data
		},
	})
}

export function useAddBlacklistWord() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (body: { word: string }) => {
			const { data, error } = await client.POST("/client/me/blacklist", {
				body,
			})
			if (error) throw error
			return data.data
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["blacklist"] }),
	})
}

export function useRemoveBlacklistWord() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (wordId: string) => {
			const { data, error } = await client.DELETE(
				"/client/me/blacklist/{wordId}",
				{ params: { path: { wordId } } },
			)
			if (error) throw error
			return data.data
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["blacklist"] }),
	})
}
