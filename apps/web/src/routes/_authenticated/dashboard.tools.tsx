import { createFileRoute } from "@tanstack/react-router"
import { PencilIcon, PlusIcon, TrashIcon } from "lucide-react"
import type { McpServerConfig } from "shared"
import {
	useCustomServers,
	useDeleteCustomServer,
	useDisablePreMadeServer,
	useEnabledPreMadeServers,
	useEnablePreMadeServer,
	usePreMadeServers,
} from "@/api/hooks/useMcp"
import { PageContainer } from "@/components/layout"
import { CustomServerDialog } from "@/components/mcp/CustomServerDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"

export const Route = createFileRoute("/_authenticated/dashboard/tools")({
	component: ToolsPage,
})

function serverLabel(mcpConfig: unknown): string {
	const raw = mcpConfig as Record<string, unknown> | null
	if (!raw) return "Unknown"
	if (typeof raw.name === "string") return raw.name
	if (raw.type === "stdio" || raw.command != null)
		return String(raw.command ?? "Unknown")
	return String(raw.url ?? "Unknown")
}

function inferType(mcpConfig: unknown): string {
	const raw = mcpConfig as Record<string, unknown> | null
	if (!raw) return "unknown"
	if (raw.type === "sse" || raw.type === "http" || raw.type === "stdio")
		return raw.type
	if (raw.command != null) return "stdio"
	if (raw.url != null) return "sse"
	return "unknown"
}

function serverTypeBadge(mcpConfig: unknown) {
	return (
		<Badge variant="outline" className="font-mono text-xs">
			{inferType(mcpConfig)}
		</Badge>
	)
}

function ToolsPage() {
	const { data: allPreMade, isLoading: loadingPreMade } = usePreMadeServers()
	const { data: enabledPreMade } = useEnabledPreMadeServers()
	const { data: customServers, isLoading: loadingCustom } = useCustomServers()

	const enableMutation = useEnablePreMadeServer()
	const disableMutation = useDisablePreMadeServer()
	const deleteMutation = useDeleteCustomServer()

	const enabledIds = new Set(enabledPreMade?.map((s) => s.id) ?? [])

	return (
		<PageContainer>
			<div>
				<h1 className="font-bold text-2xl text-foreground tracking-tight">
					Tools
				</h1>
				<p className="text-muted-foreground">
					Manage MCP (Model Context Protocol) tools and integrations for your
					bot.
				</p>
			</div>

			{/* ─── Pre-made servers ─────────────────────────────── */}
			<Card>
				<CardHeader>
					<CardTitle>Pre-configured Servers</CardTitle>
				</CardHeader>
				<CardContent>
					{loadingPreMade ? (
						<div className="space-y-3">
							<Skeleton className="h-14 w-full" />
							<Skeleton className="h-14 w-full" />
						</div>
					) : !allPreMade?.length ? (
						<p className="text-muted-foreground text-sm">
							No pre-configured servers available yet.
						</p>
					) : (
						<div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
							{allPreMade.map((server) => {
								const isEnabled = enabledIds.has(server.id)
								const isPending =
									enableMutation.isPending || disableMutation.isPending
								return (
									<div
										key={server.id}
										className="flex items-center justify-between p-4"
									>
										<div className="flex items-center gap-3">
											{serverTypeBadge(server.mcpConfig)}
											<span className="truncate font-medium text-sm">
												{serverLabel(server.mcpConfig)}
											</span>
										</div>
										<Switch
											checked={isEnabled}
											disabled={isPending}
											onCheckedChange={(checked) => {
												if (checked) {
													enableMutation.mutate(server.id)
												} else {
													disableMutation.mutate(server.id)
												}
											}}
										/>
									</div>
								)
							})}
						</div>
					)}
				</CardContent>
			</Card>

			{/* ─── Custom servers ───────────────────────────────── */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Custom Servers</CardTitle>
					<CustomServerDialog
						trigger={
							<Button size="sm">
								<PlusIcon className="mr-1 size-4" />
								Add server
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
							{customServers.map((server) => (
								<div
									key={server.id}
									className="flex items-center justify-between p-4"
								>
									<div className="flex items-center gap-3">
										{serverTypeBadge(server.mcpConfig)}
										<span className="truncate font-medium text-sm">
											{serverLabel(server.mcpConfig)}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<CustomServerDialog
											trigger={
												<Button size="sm" variant="ghost">
													<PencilIcon className="size-4" />
													<span className="sr-only">Edit</span>
												</Button>
											}
											serverId={server.id}
											initialData={server.mcpConfig as McpServerConfig}
										/>
										<Button
											size="sm"
											variant="ghost"
											className="text-destructive hover:text-destructive"
											disabled={deleteMutation.isPending}
											onClick={() => deleteMutation.mutate(server.id)}
										>
											<TrashIcon className="size-4" />
											<span className="sr-only">Delete</span>
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</PageContainer>
	)
}
