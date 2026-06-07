import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ProviderType, UpsertProviderConfigBody } from "shared"
import { client } from "@/api/client"

// Extract raw response and make fields required to match what backend returns
export type ProviderConfigResponse = {
	id: string
	clientId: string
	providerType: ProviderType
	apiKeyMasked: string
	model: string
	baseUrl: string | null
	embeddingModel?: string | null
	updatedAt: string
}

const QUERY_KEY = ["provider-config"] as const

export function useProviderConfig() {
	return useQuery<ProviderConfigResponse | null>({
		queryKey: QUERY_KEY,
		queryFn: async () => {
			const { data, error } = await client.GET("/client/me/provider-config", {})
			if (error) throw error
			// Type assertion needed because generated types have optional fields
			// but backend always returns complete objects
			return (data as ProviderConfigResponse | null) ?? null
		},
	})
}

export function useUpsertProviderConfig() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (body: UpsertProviderConfigBody) => {
			const { data, error } = await client.PUT("/client/me/provider-config", {
				body,
			})
			if (error) throw error
			return data
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
	})
}

export function useDeleteProviderConfig() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async () => {
			const { error } = await client.DELETE("/client/me/provider-config", {})
			if (error) throw error
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
	})
}
