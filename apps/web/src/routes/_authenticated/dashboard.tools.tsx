import { createFileRoute } from "@tanstack/react-router"
import {
	ChevronDownIcon,
	ChevronUpIcon,
	PencilIcon,
	PlusIcon,
	TrashIcon,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { McpRemoteServerConfig } from "shared"
import {
	useCustomServers,
	useDeleteCustomServer,
	useDisablePreMadeServer,
	useEnabledPreMadeServers,
	useEnablePreMadeServer,
	usePreMadeServers,
} from "@/api/hooks/useMcp"
import { useVerifyMcp } from "@/api/hooks/useMcpVerify"
import { PageContainer } from "@/components/layout"
import { CustomMcpDialog } from "@/components/mcp/CustomMcpDialog"
import { McpStatusBadge } from "@/components/mcp/McpStatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"

export const Route = createFileRoute("/_authenticated/dashboard/tools")({
	component: ToolsPage,
})

function serverLabel(mcpConfig: unknown, t: (key: string) => string): string {
	const raw = mcpConfig as Record<string, unknown> | null
	if (!raw) return t("tools.unknownServer")
	if (typeof raw.name === "string") return raw.name
	if (raw.type === "stdio" || raw.command != null)
		return String(raw.command ?? t("tools.unknownServer"))
	return String(raw.url ?? t("tools.unknownServer"))
}

function inferType(mcpConfig: unknown, t: (key: string) => string): string {
	const raw = mcpConfig as Record<string, unknown> | null
	if (!raw) return t("tools.unknownType")
	if (raw.type === "http" || raw.type === "stdio") return raw.type
	if (raw.command != null) return "stdio"
	if (raw.url != null) return "http"
	return t("tools.unknownType")
}

function serverTypeBadge(mcpConfig: unknown, t: (key: string) => string) {
	return (
		<Badge variant="outline" className="font-mono text-xs">
			{inferType(mcpConfig, t)}
		</Badge>
	)
}

function ExpandableMcpDetail({
	serverId,
	isVisible,
}: {
	serverId: string
	isVisible: boolean
}) {
	const { t } = useTranslation()
	const { data } = useVerifyMcp({
		kind: "client",
		serverId,
		enabled: isVisible,
	})
	if (!isVisible) return null
	return (
		<div className="mt-2 space-y-2 border-border border-t pt-2">
			{!data ? (
				<Skeleton className="h-4 w-24" />
			) : data.ok ? (
				<div className="space-y-1">
					<p className="font-medium text-xs">{t("tools.availableTools")}</p>
					{data.tools.length === 0 ? (
						<p className="text-muted-foreground text-xs">
							{t("tools.noToolsFound")}
						</p>
					) : (
						<div className="flex flex-wrap gap-1">
							{data.tools.map((name) => (
								<Badge key={name} variant="secondary" className="text-xs">
									{name}
								</Badge>
							))}
						</div>
					)}
				</div>
			) : (
				<p className="text-red-600 text-xs dark:text-red-400">{data.error}</p>
			)}
		</div>
	)
}

function ToolsPage() {
	const { t } = useTranslation()
	const { data: allPreMade, isLoading: loadingPreMade } = usePreMadeServers()
	const { data: enabledPreMade } = useEnabledPreMadeServers()
	const { data: customServers, isLoading: loadingCustom } = useCustomServers()
	const enableMutation = useEnablePreMadeServer()
	const disableMutation = useDisablePreMadeServer()
	const deleteMutation = useDeleteCustomServer()

	const [expandedPreMade, setExpandedPreMade] = useState<string | null>(null)
	const [expandedCustom, setExpandedCustom] = useState<string | null>(null)

	const enabledIds = new Set(enabledPreMade?.map((s) => s.id) ?? [])

	return (
		<PageContainer>
			<div>
				<h1 className="font-bold text-2xl text-foreground tracking-tight">
					MCP Tools
				</h1>
				<p className="text-muted-foreground">
					Manage MCP (Model Context Protocol) tools and integrations for your
					bot.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{t("tools.preconfiguredServers")}</CardTitle>
				</CardHeader>
				<CardContent>
					{loadingPreMade ? (
						<div className="space-y-3">
							<Skeleton className="h-14 w-full" />
							<Skeleton className="h-14 w-full" />
						</div>
					) : !allPreMade?.length ? (
						<p className="text-muted-foreground text-sm">
							{t("tools.noPreconfiguredServers")}
						</p>
					) : (
						<div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
							{allPreMade.map((server) => {
								const isEnabled = enabledIds.has(server.id)
								const isExpanded = expandedPreMade === server.id
								return (
									<div key={server.id} className="p-4 hover:bg-muted/50">
										<div className="flex items-start justify-between gap-3">
											<div className="flex items-start gap-3">
												<div className="flex flex-col gap-1">
													{isEnabled ? (
														<button
															type="button"
															className="flex cursor-pointer items-center gap-3"
															onClick={() =>
																setExpandedPreMade(
																	isExpanded ? null : server.id,
																)
															}
														>
															{isExpanded ? (
																<ChevronUpIcon className="size-4" />
															) : (
																<ChevronDownIcon className="size-4" />
															)}
															{serverTypeBadge(server.mcpConfig, t)}
															<span className="truncate font-medium text-sm hover:underline">
																{server.name}
															</span>
															<McpStatusBadge serverId={server.id} />
														</button>
													) : (
														<div className="flex items-center gap-3">
															{serverTypeBadge(server.mcpConfig, t)}
															<span className="truncate font-medium text-sm">
																{server.name}
															</span>
														</div>
													)}
													{server.description && (
														<p className="text-muted-foreground text-xs">
															{server.description}
														</p>
													)}
												</div>
											</div>
											<Switch
												checked={isEnabled}
												disabled={
													enableMutation.isPending || disableMutation.isPending
												}
												onCheckedChange={(checked) => {
													if (checked) {
														enableMutation.mutate(server.id)
													} else {
														disableMutation.mutate(server.id)
													}
												}}
											/>
										</div>
										{isEnabled && (
											<ExpandableMcpDetail
												serverId={server.id}
												isVisible={isExpanded}
											/>
										)}
									</div>
								)
							})}
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>{t("tools.customServers")}</CardTitle>
					<CustomMcpDialog
						trigger={
							<Button size="sm">
								<PlusIcon className="mr-1 size-4" />
								{t("common.add")}
							</Button>
						}
					/>
				</CardHeader>
				<CardContent>
					{loadingCustom ? (
						<div className="space-y-3">
							<Skeleton className="h-14 w-full" />
						</div>
					) : !customServers?.length ? (
						<p className="text-muted-foreground text-sm">
							No custom servers yet. Add one to give your bot access to your own
							data sources.
						</p>
					) : (
						<div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
							{customServers.map((server) => {
								const isExpanded = expandedCustom === server.id
								return (
									<div key={server.id} className="p-4 hover:bg-muted/50">
										<div className="flex items-start justify-between gap-3">
											<button
												type="button"
												className="flex cursor-pointer items-center gap-3"
												onClick={() =>
													setExpandedCustom(isExpanded ? null : server.id)
												}
											>
												{isExpanded ? (
													<ChevronUpIcon className="size-4" />
												) : (
													<ChevronDownIcon className="size-4" />
												)}
												{serverTypeBadge(server.mcpConfig, t)}
												<span className="truncate font-medium text-sm hover:underline">
													{serverLabel(server.mcpConfig, t)}
												</span>
												<McpStatusBadge serverId={server.id} />
											</button>
											<div className="flex items-center gap-2">
												<CustomMcpDialog
													trigger={
														<Button
															size="sm"
															variant="ghost"
															onClick={(e) => e.stopPropagation()}
														>
															<PencilIcon className="size-4" />
															<span className="sr-only">
																{t("common.edit")}
															</span>
														</Button>
													}
													serverId={server.id}
													initialData={
														server.mcpConfig as McpRemoteServerConfig
													}
												/>
												<Button
													size="sm"
													variant="ghost"
													className="text-destructive hover:text-destructive"
													disabled={deleteMutation.isPending}
													onClick={(e) => {
														e.stopPropagation()
														deleteMutation.mutate(server.id)
													}}
												>
													<TrashIcon className="size-4" />
													<span className="sr-only">{t("common.delete")}</span>
												</Button>
											</div>
										</div>
										<ExpandableMcpDetail
											serverId={server.id}
											isVisible={isExpanded}
										/>
									</div>
								)
							})}
						</div>
					)}
				</CardContent>
			</Card>
		</PageContainer>
	)
}
