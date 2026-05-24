import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { McpServerConfig } from "shared"
import { useVerifyMcp } from "@/api/hooks/useMcpVerify"
import { Badge } from "@/components/ui/badge"

export function McpStatusBadge(
	props: { config: McpServerConfig } | { serverId: string },
) {
	const options =
		"config" in props
			? ({ kind: "admin", config: props.config } as const)
			: ({ kind: "client", serverId: props.serverId } as const)
	const { t } = useTranslation()
	const { data, isPending } = useVerifyMcp(options)

	if (isPending)
		return <Loader2 className="size-4 animate-spin text-muted-foreground" />

	if (!data) return null

	if (data.ok)
		return (
			<Badge
				variant="outline"
				className="border-green-600/30 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
			>
				{t("mcp.status.ready")}
			</Badge>
		)

	return (
		<Badge
			variant="outline"
			className="border-red-600/30 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
		>
			{t("mcp.status.error")}
		</Badge>
	)
}
