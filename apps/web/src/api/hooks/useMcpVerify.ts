import { useQuery } from "@tanstack/react-query"
import type { McpServerConfig } from "shared"
import { client } from "@/api/client"

type VerifyOk = { ok: true; tools: string[] }
type VerifyError = { ok: false; error: string }
type VerifyResponse = VerifyOk | VerifyError

export type UseVerifyMcpOptions =
	| { readonly kind: "admin"; readonly config: McpServerConfig }
	| { readonly kind: "client"; readonly serverId: string }

type VerifyMcpQueryOptions = UseVerifyMcpOptions & {
	readonly enabled?: boolean
}

export function useVerifyMcp(options: VerifyMcpQueryOptions) {
	return useQuery<VerifyResponse>({
		queryKey: [
			"mcp-verify",
			options.kind,
			options.kind === "admin"
				? options.config.type === "http"
					? options.config.url
					: options.config.command
				: options.serverId,
		],
		enabled: options.enabled ?? true,
		queryFn: async () => {
			if (options.kind === "admin") {
				const { data, error } = await client.POST(
					"/admin/mcp/pre-made/verify",
					{
						body: { mcpConfig: options.config },
					},
				)
				if (error) throw error
				return data as unknown as VerifyResponse
			}
			const { data, error } = await client.POST("/client/me/mcp/verify", {
				body: { serverId: options.serverId },
			})
			if (error) throw error
			return data as unknown as VerifyResponse
		},
		staleTime: 0,
		retry: false,
	})
}
