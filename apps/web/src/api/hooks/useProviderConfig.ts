import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ProviderType } from "shared"
import { client } from "../client"

// Extract raw response and make fields required to match what backend returns
export type ProviderConfigResponse = {
	id: string
	clientId: string
	providerType: ProviderType
	apiKeyMasked: string
	model: string
	baseUrl: string | null
	updatedAt: string
}

type UpsertProviderConfigBody = {
	providerType: ProviderType
	apiKey: string
	model: string
	baseUrl?: string
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
			return (data.data as ProviderConfigResponse | null) ?? null
		},
	})
}

export function useUpsertProviderConfig() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (body: UpsertProviderConfigBody) => {
			// Cast body to never to satisfy OpenAPI discriminated union
			// The backend validates the actual shape
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const { data, error } = await client.PUT("/client/me/provider-config", {
				body: body as never,
			})
			if (error) throw error
			return data.data
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
