import {
	ChevronDownIcon,
	ChevronUpIcon,
	Trash2Icon,
	WandIcon,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { McpServerConfig } from "shared"
import type { paths } from "@/api/generated/openapi"
import { useVerifyMcp } from "@/api/hooks/useMcpVerify"
import { McpStatusBadge } from "@/components/mcp/McpStatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

function toMcpServerConfig(raw: unknown): McpServerConfig {
	if (typeof raw !== "object" || raw === null) {
		throw new Error("Invalid MCP config")
	}
	const obj = raw as Record<string, unknown>
	if (obj.type === "http") {
		return {
			type: "http",
			url: typeof obj.url === "string" ? obj.url : "",
			headers:
				typeof obj.headers === "object" && obj.headers !== null
					? (obj.headers as Record<string, string>)
					: undefined,
		}
	}
	if (obj.type === "stdio") {
		return {
			type: "stdio",
			command: typeof obj.command === "string" ? obj.command : "",
			args: Array.isArray(obj.args)
				? (obj.args as string[]).filter(
						(a): a is string => typeof a === "string",
					)
				: undefined,
			env:
				typeof obj.env === "object" && obj.env !== null
					? (obj.env as Record<string, string>)
					: undefined,
		}
	}
	throw new Error(`Unknown MCP config type: ${String(obj.type)}`)
}

type PreMadeServerResponse =
	paths["/admin/mcp/pre-made"]["get"]["responses"][200]["content"]["application/json"][number]

type Props = {
	servers?: PreMadeServerResponse[]
	onEdit?: (server: PreMadeServerResponse) => void
	onDelete?: (server: PreMadeServerResponse) => void
	pendingId?: string
}

function getTypeInfo(type?: string) {
	return type === "http"
		? { label: "HTTP", variant: "default" as const }
		: { label: "stdio", variant: "secondary" as const }
}

function McpExpandableRow({ config }: { config: unknown }) {
	const { data } = useVerifyMcp({
		kind: "admin",
		config: toMcpServerConfig(config),
	})

	return (
		<tr>
			<td colSpan={6} className="bg-zinc-50 px-6 py-4 dark:bg-zinc-900">
				{!data ? (
					<Spinner size="sm" />
				) : data.ok ? (
					<div className="space-y-2">
						<p className="font-medium text-sm">Available tools:</p>
						{data.tools.length === 0 ? (
							<p className="text-muted-foreground text-xs">No tools found</p>
						) : (
							<div className="flex flex-wrap gap-2">
								{data.tools.map((name) => (
									<Badge key={name} variant="secondary" className="text-xs">
										{name}
									</Badge>
								))}
							</div>
						)}
					</div>
				) : (
					<p className="text-red-600 text-sm dark:text-red-400">{data.error}</p>
				)}
			</td>
		</tr>
	)
}

export function McpTable({ servers, onEdit, onDelete, pendingId }: Props) {
	const { t } = useTranslation()
	const [expandedId, setExpandedId] = useState<string | null>(null)

	return (
		<Card className="overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
			<div className="overflow-x-auto">
				<table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
					<thead className="border-zinc-200 border-b bg-zinc-50 text-xs text-zinc-700 uppercase dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
						<tr>
							<th scope="col" className="px-2 py-3" />
							<th scope="col" className="px-6 py-3">
								{t("backoffice.mcpServersTable.name")}
							</th>
							<th scope="col" className="px-6 py-3">
								{t("backoffice.mcpServersTable.description")}
							</th>
							<th scope="col" className="px-6 py-3">
								{t("backoffice.mcpServersTable.type")}
							</th>
							<th scope="col" className="px-6 py-3">
								Status
							</th>
							<th scope="col" className="px-6 py-3 text-right">
								{t("backoffice.mcpServersTable.actions")}
							</th>
						</tr>
					</thead>
					<tbody>
						{servers === undefined ? (
							<tr>
								<td
									colSpan={6}
									className="bg-white px-6 py-8 text-center dark:bg-zinc-950"
								>
									<Spinner size="md" className="mx-auto text-primary" />
								</td>
							</tr>
						) : servers.length === 0 ? (
							<tr>
								<td
									colSpan={6}
									className="px-6 py-4 text-center text-zinc-500 dark:text-zinc-400"
								>
									{t("backoffice.mcpServersTable.noServers")}
								</td>
							</tr>
						) : (
							servers.map((server) => {
								const isExpanded = expandedId === server.id
								const config = server.mcpConfig as {
									type?: string
									url?: string
									command?: string
								}
								const typeInfo = getTypeInfo(config.type)
								return (
									<>
										<tr className="border-zinc-200 border-b dark:border-zinc-800">
											<td className="px-2 py-4">
												<Button
													variant="ghost"
													size="icon"
													className="size-7"
													onClick={() =>
														setExpandedId(isExpanded ? null : server.id)
													}
												>
													{isExpanded ? (
														<ChevronUpIcon className="size-4" />
													) : (
														<ChevronDownIcon className="size-4" />
													)}
												</Button>
											</td>
											<td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">
												{server.name}
											</td>
											<td className="px-6 py-4 dark:text-zinc-300">
												{server.description ?? "-"}
											</td>
											<td className="px-6 py-4">
												<Badge variant={typeInfo.variant}>
													{typeInfo.label}
												</Badge>
											</td>
											<td className="px-6 py-4">
												<McpStatusBadge
													config={toMcpServerConfig(server.mcpConfig)}
												/>
											</td>
											<td className="space-x-2 px-6 py-4 text-right">
												<Button
													variant="outline"
													size="sm"
													disabled={pendingId === server.id}
													onClick={() => onEdit?.(server)}
												>
													{pendingId === server.id ? (
														<Spinner size="sm" className="mr-1" />
													) : (
														<WandIcon className="mr-1 h-4 w-4" />
													)}
													{t("backoffice.mcpServersTable.edit")}
												</Button>
												<Button
													variant="outline"
													size="sm"
													className="text-red-600 hover:text-red-700 dark:text-red-500"
													disabled={pendingId === server.id}
													onClick={() => onDelete?.(server)}
												>
													{pendingId === server.id ? (
														<Spinner size="sm" className="mr-1" />
													) : (
														<Trash2Icon className="mr-1 h-4 w-4" />
													)}
													{t("backoffice.mcpServersTable.delete")}
												</Button>
											</td>
										</tr>
										{isExpanded && (
											<McpExpandableRow
												config={toMcpServerConfig(server.mcpConfig)}
											/>
										)}
									</>
								)
							})
						)}
					</tbody>
				</table>
			</div>
		</Card>
	)
}
