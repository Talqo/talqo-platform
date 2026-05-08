import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { client } from "@/api/client"
import type { paths } from "@/api/generated/openapi"

type WidgetConfigBody = NonNullable<
	paths["/client/me/widget-config"]["put"]["requestBody"]
>["content"]["application/json"]

export function useWidgetConfig() {
	return useQuery({
		queryKey: ["widget-config"],
		queryFn: async () => {
			const { data, error } = await client.GET("/client/me/widget-config", {})
			if (error) throw error
			return data
		},
	})
}

export function useUpdateWidgetConfig() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (body: WidgetConfigBody) => {
			const { data, error } = await client.PUT("/client/me/widget-config", {
				body,
			})
			if (error) throw error
			return data
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["widget-config"] }),
	})
}
