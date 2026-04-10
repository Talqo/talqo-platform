import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { client } from "../client"

export function useAdminLogin() {
	return useMutation({
		mutationFn: async (body: { email: string; password: string }) => {
			const { data, error } = await client.POST("/admin/auth/login", { body })
			if (error) throw error
			return data.data
		},
		onSuccess: ({ token }) => {
			localStorage.setItem("token", token)
		},
	})
}

export function useAdminLogout() {
	return useMutation({
		mutationFn: async () => {
			const { data, error } = await client.POST("/admin/auth/logout", {})
			if (error) throw error
			localStorage.removeItem("token")
			return data.data
		},
	})
}

export function useAdminClients(
	params: { limit?: number; offset?: number } = {},
) {
	return useQuery({
		queryKey: ["admin", "clients", params],
		queryFn: async () => {
			const { data, error } = await client.GET("/admin/clients", {
				params: { query: params },
			})
			if (error) throw error
			return data.data
		},
	})
}

export function useAdminClient(clientId: string) {
	return useQuery({
		queryKey: ["admin", "clients", clientId],
		queryFn: async () => {
			const { data, error } = await client.GET("/admin/clients/:clientId", {
				params: { path: { clientId } },
			})
			if (error) throw error
			return data.data
		},
	})
}

export function useUpdateClientStatus() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async ({
			clientId,
			status,
		}: {
			clientId: string
			status: "active" | "suspended"
		}) => {
			const { data, error } = await client.PATCH(
				"/admin/clients/:clientId/status",
				{ params: { path: { clientId } }, body: { status } },
			)
			if (error) throw error
			return data.data
		},
		onSuccess: (_result, { clientId }) => {
			qc.invalidateQueries({ queryKey: ["admin", "clients", clientId] })
			qc.invalidateQueries({ queryKey: ["admin", "clients"] })
		},
	})
}

export function useImpersonateClient() {
	return useMutation({
		mutationFn: async (clientId: string) => {
			const { data, error } = await client.POST(
				"/admin/clients/:clientId/impersonate",
				{ params: { path: { clientId } } },
			)
			if (error) throw error
			return data.data
		},
	})
}

export function useAdminPlatformStats() {
	return useQuery({
		queryKey: ["admin", "analytics"],
		queryFn: async () => {
			const { data, error } = await client.GET("/admin/analytics", {})
			if (error) throw error
			return data.data
		},
	})
}

// ─── Admin MCP ─────────────────────────────────────────────────────────────────

export function useAdminPreMadeServers() {
	return useQuery({
		queryKey: ["admin", "mcp", "pre-made"],
		queryFn: async () => {
			const { data, error } = await client.GET("/admin/mcp/pre-made", {})
			if (error) throw error
			return data.data
		},
	})
}

export function useAdminCreatePreMadeServer() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (body: { mcpConfig: unknown }) => {
			const { data, error } = await client.POST("/admin/mcp/pre-made", {
				body,
			})
			if (error) throw error
			return data.data
		},
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["admin", "mcp", "pre-made"] }),
	})
}

export function useAdminUpdatePreMadeServer() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async ({
			serverId,
			mcpConfig,
		}: {
			serverId: string
			mcpConfig: unknown
		}) => {
			const { data, error } = await client.PATCH(
				"/admin/mcp/pre-made/:serverId",
				{ params: { path: { serverId } }, body: { mcpConfig } },
			)
			if (error) throw error
			return data.data
		},
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["admin", "mcp", "pre-made"] }),
	})
}

export function useAdminDeletePreMadeServer() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (serverId: string) => {
			const { data, error } = await client.DELETE(
				"/admin/mcp/pre-made/:serverId",
				{ params: { path: { serverId } } },
			)
			if (error) throw error
			return data.data
		},
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["admin", "mcp", "pre-made"] }),
	})
}
