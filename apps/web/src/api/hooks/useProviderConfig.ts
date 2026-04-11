import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { client } from "../client"
import type { paths } from "../generated/openapi"

type ProviderConfigPath = paths["/client/me/provider-config"]

export type ProviderConfigResponse = NonNullable<
	ProviderConfigPath["get"]["responses"][200]["content"]["application/json"]["data"]
>

type UpsertProviderConfigBody = NonNullable<
	ProviderConfigPath["put"]["requestBody"]
>["content"]["application/json"]

const QUERY_KEY = ["provider-config"] as const

export function useProviderConfig() {
	return useQuery({
		queryKey: QUERY_KEY,
		queryFn: async () => {
			const { data, error } = await client.GET("/client/me/provider-config", {})
			if (error) throw error
			return data.data ?? null
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
