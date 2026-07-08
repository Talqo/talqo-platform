import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import type { ClientEntry } from "./types"

type ClientsTableProps = {
	clients: ClientEntry[]
	onSuspend?: (id: string) => void
	onReEnable?: (id: string) => void
	onImpersonate?: (id: string) => void
	pendingId?: string
}

export function ClientsTable({
	clients,
	onSuspend,
	onReEnable,
	onImpersonate,
	pendingId,
}: ClientsTableProps) {
	const { t } = useTranslation()

	return (
		<Card className="overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
			<div className="overflow-x-auto">
				<table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
					<thead className="border-zinc-200 border-b bg-zinc-50 text-xs text-zinc-700 uppercase dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
						<tr>
							<th scope="col" className="px-6 py-3">
								{t("backoffice.clientsTable.client")}
							</th>
							<th scope="col" className="px-6 py-3">
								{t("backoffice.clientsTable.status")}
							</th>
							<th scope="col" className="px-6 py-3">
								{t("backoffice.clientsTable.aiProvider")}
							</th>
							<th scope="col" className="px-6 py-3">
								{t("backoffice.clientsTable.tokenUsage")}
							</th>
							<th scope="col" className="px-6 py-3 text-right">
								{t("backoffice.clientsTable.actions")}
							</th>
						</tr>
					</thead>
					<tbody>
						{clients.length === 0 ? (
							<tr>
								<td
									colSpan={5}
									className="px-6 py-4 text-center text-zinc-500 dark:text-zinc-400"
								>
									{t("backoffice.clientsTable.noClientsFound")}
								</td>
							</tr>
						) : (
							clients.map((client) => (
								<tr
									key={client.id}
									className="border-zinc-200 border-b bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
								>
									<td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">
										{client.name}
									</td>
									<td className="px-6 py-4">
										{client.status === "active" ? (
											<Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
												{t("backoffice.clientsTable.active")}
											</Badge>
										) : (
											<Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">
												{t("backoffice.clientsTable.suspended")}
											</Badge>
										)}
									</td>
									<td className="px-6 py-4 dark:text-zinc-300">
										{client.aiProvider}
									</td>
									<td className="px-6 py-4 dark:text-zinc-300">
										{client.tokenUsage}
									</td>
									<td className="space-x-2 px-6 py-4 text-right">
										<Button
											variant="outline"
											size="sm"
											disabled={pendingId === client.id}
											onClick={() => onImpersonate?.(client.id)}
										>
											{pendingId === client.id ? (
												<Spinner size="sm" className="mr-1" />
											) : null}
											{t("backoffice.clientsTable.impersonate")}
										</Button>
										{client.status === "active" ? (
											<Button
												variant="outline"
												size="sm"
												className="text-red-600 hover:text-red-700 dark:text-red-500"
												disabled={pendingId === client.id}
												onClick={() => onSuspend?.(client.id)}
											>
												{t("backoffice.clientsTable.suspend")}
											</Button>
										) : (
											<Button
												variant="outline"
												size="sm"
												className="text-green-600 hover:text-green-700 dark:text-green-500"
												disabled={pendingId === client.id}
												onClick={() => onReEnable?.(client.id)}
											>
												{t("backoffice.clientsTable.reEnable")}
											</Button>
										)}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</Card>
	)
}
