import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { McpServerConfigInput } from "shared"
import { client } from "@/api/client"
import type { ApiError } from "./useAuth"

export function useAdminProfile() {
	return useQuery({
		queryKey: ["admin", "profile"],
		queryFn: async () => {
			const { data, error } = await client.GET("/admin/me")
			if (error) throw error
			return data
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
			return data
		},
	})
}

export function useAdminClient(clientId: string) {
	return useQuery({
		queryKey: ["admin", "clients", clientId],
		queryFn: async () => {
			const { data, error } = await client.GET("/admin/clients/{clientId}", {
				params: { path: { clientId } },
			})
			if (error) throw error
			return data
		},
	})
}

export function useUpdateClientStatus() {
	const qc = useQueryClient()
	return useMutation<
		unknown,
		ApiError,
		{ clientId: string; status: "active" | "suspended" }
	>({
		mutationFn: async ({ clientId, status }) => {
			const { data, error } = await client.PATCH(
				"/admin/clients/{clientId}/status",
				{ params: { path: { clientId } }, body: { status } },
			)
			if (error) throw error
			return data
		},
		onSuccess: (_result, { clientId }) => {
			qc.invalidateQueries({ queryKey: ["admin", "clients", clientId] })
			qc.invalidateQueries({ queryKey: ["admin", "clients"] })
			qc.invalidateQueries({ queryKey: ["admin", "activity-logs"] })
		},
	})
}

export function useImpersonateClient() {
	const qc = useQueryClient()
	return useMutation<{ token: string }, ApiError, string>({
		mutationFn: async (clientId) => {
			const { data, error } = await client.POST(
				"/admin/clients/{clientId}/impersonate",
				{ params: { path: { clientId } } },
			)
			if (error) throw error
			return data
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["admin", "activity-logs"] })
			qc.invalidateQueries({ queryKey: ["auth", "me"] })
		},
	})
}

export function useAdminPlatformStats() {
	return useQuery({
		queryKey: ["admin", "analytics"],
		queryFn: async () => {
			const { data, error } = await client.GET("/admin/analytics", {})
			if (error) throw error
			return data
		},
	})
}

export function useAdminAnalyticsSummary() {
	return useQuery({
		queryKey: ["admin", "analytics", "summary"],
		queryFn: async () => {
			const { data, error } = await client.GET("/admin/analytics/summary", {})
			if (error) throw error
			return data
		},
	})
}

export function useAdminTokenAnalytics(
	params: {
		from?: string
		to?: string
		granularity?: "day" | "week" | "month"
	} = {},
) {
	return useQuery({
		queryKey: ["admin", "analytics", "tokens", params],
		queryFn: async () => {
			const { data, error } = await client.GET("/admin/analytics/tokens", {
				params: { query: params },
			})
			if (error) throw error
			return data
		},
	})
}

export function useAdminConversationAnalytics(
	params: {
		from?: string
		to?: string
		granularity?: "day" | "week" | "month"
	} = {},
) {
	return useQuery({
		queryKey: ["admin", "analytics", "conversations", params],
		queryFn: async () => {
			const { data, error } = await client.GET(
				"/admin/analytics/conversations",
				{ params: { query: params } },
			)
			if (error) throw error
			return data
		},
	})
}

// ─── Admin Conversations ───────────────────────────────────────────────────────

export function useAdminConversations(
	params: { clientId?: string; limit?: number; offset?: number } = {},
) {
	return useQuery({
		queryKey: ["admin", "conversations", params],
		queryFn: async () => {
			const { data, error } = await client.GET("/admin/conversations", {
				params: { query: params },
			})
			if (error) throw error
			return data
		},
	})
}

export function useAdminConversation(conversationId: string) {
	return useQuery({
		queryKey: ["admin", "conversations", conversationId],
		queryFn: async () => {
			const { data, error } = await client.GET(
				"/admin/conversations/{conversationId}",
				{ params: { path: { conversationId } } },
			)
			if (error) throw error
			return data
		},
		enabled: !!conversationId,
	})
}

// ─── Admin MCP ─────────────────────────────────────────────────────────────────

export function useAdminPreMadeServers() {
	return useQuery({
		queryKey: ["admin", "mcp", "pre-made"],
		queryFn: async () => {
			const { data, error } = await client.GET("/admin/mcp/pre-made", {})
			if (error) throw error
			return data
		},
	})
}

export function useAdminCreatePreMadeServer() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (body: {
			name: string
			description?: string
			mcpConfig: McpServerConfigInput
		}) => {
			const { data, error } = await client.POST("/admin/mcp/pre-made", {
				body,
			})
			if (error) throw error
			return data
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
			name,
			description,
			mcpConfig,
		}: {
			serverId: string
			name: string
			description?: string
			mcpConfig: McpServerConfigInput
		}) => {
			const { data, error } = await client.PATCH(
				"/admin/mcp/pre-made/{serverId}",
				{
					params: { path: { serverId } },
					body: { name, description, mcpConfig },
				},
			)
			if (error) throw error
			return data
		},
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["admin", "mcp", "pre-made"] }),
	})
}

export function useAdminActivityLogs(
	params: { limit?: number; offset?: number } = {},
) {
	return useQuery({
		queryKey: ["admin", "activity-logs", params],
		queryFn: async () => {
			const { data, error } = await client.GET("/admin/activity-logs", {
				params: { query: params },
			})
			if (error) throw error
			return data
		},
	})
}

export function useAdminDeletePreMadeServer() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (serverId: string) => {
			const { data, error } = await client.DELETE(
				"/admin/mcp/pre-made/{serverId}",
				{ params: { path: { serverId } } },
			)
			if (error) throw error
			return data
		},
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["admin", "mcp", "pre-made"] }),
	})
}
