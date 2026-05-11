import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { McpRemoteServerConfig } from "shared"
import { client } from "@/api/client"

// ─── Pre-made servers ──────────────────────────────────────────────────────────

export function usePreMadeServers() {
	return useQuery({
		queryKey: ["mcp", "pre-made"],
		queryFn: async () => {
			const { data, error } = await client.GET("/client/me/mcp/pre-made", {})
			if (error) throw error
			return data
		},
	})
}

export function useEnabledPreMadeServers() {
	return useQuery({
		queryKey: ["mcp", "pre-made", "enabled"],
		queryFn: async () => {
			const { data, error } = await client.GET(
				"/client/me/mcp/pre-made/enabled",
				{},
			)
			if (error) throw error
			return data
		},
	})
}

export function useEnablePreMadeServer() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (serverId: string) => {
			const { data, error } = await client.POST(
				"/client/me/mcp/pre-made/{serverId}",
				{ params: { path: { serverId } } },
			)
			if (error) throw error
			return data
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["mcp"] }),
	})
}

export function useDisablePreMadeServer() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (serverId: string) => {
			const { data, error } = await client.DELETE(
				"/client/me/mcp/pre-made/{serverId}",
				{ params: { path: { serverId } } },
			)
			if (error) throw error
			return data
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["mcp"] }),
	})
}

// ─── Custom servers ────────────────────────────────────────────────────────────

export function useCustomServers() {
	return useQuery({
		queryKey: ["mcp", "custom"],
		queryFn: async () => {
			const { data, error } = await client.GET("/client/me/mcp/custom", {})
			if (error) throw error
			return data
		},
	})
}

export function useCreateCustomServer() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (body: { mcpConfig: McpRemoteServerConfig }) => {
			const { data, error } = await client.POST("/client/me/mcp/custom", {
				body,
			})
			if (error) throw error
			return data
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["mcp", "custom"] }),
	})
}

export function useUpdateCustomServer() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async ({
			serverId,
			mcpConfig,
		}: {
			serverId: string
			mcpConfig: McpRemoteServerConfig
		}) => {
			const { data, error } = await client.PATCH(
				"/client/me/mcp/custom/{serverId}",
				{ params: { path: { serverId } }, body: { mcpConfig } },
			)
			if (error) throw error
			return data
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["mcp", "custom"] }),
	})
}

export function useDeleteCustomServer() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (serverId: string) => {
			const { data, error } = await client.DELETE(
				"/client/me/mcp/custom/{serverId}",
				{ params: { path: { serverId } } },
			)
			if (error) throw error
			return data
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["mcp", "custom"] }),
	})
}
