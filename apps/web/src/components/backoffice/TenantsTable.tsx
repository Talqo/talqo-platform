import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import type { Tenant } from "@/data/backoffice"

interface TenantsTableProps {
	tenants?: Tenant[]
	onSuspend?: (id: string) => void
	onReEnable?: (id: string) => void
	onImpersonate?: (id: string) => void
	pendingId?: string
}

export function TenantsTable({
	tenants,
	onSuspend,
	onReEnable,
	onImpersonate,
	pendingId,
}: TenantsTableProps) {
	return (
		<Card className="overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
			<div className="overflow-x-auto">
				<table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
					<thead className="border-zinc-200 border-b bg-zinc-50 text-xs text-zinc-700 uppercase dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
						<tr>
							<th scope="col" className="px-6 py-3">
								Client
							</th>
							<th scope="col" className="px-6 py-3">
								Status
							</th>
							<th scope="col" className="px-6 py-3">
								API Type
							</th>
							<th scope="col" className="px-6 py-3">
								Token Usage
							</th>
							<th scope="col" className="px-6 py-3 text-right">
								Actions
							</th>
						</tr>
					</thead>
					<tbody>
						{tenants === undefined ? (
							<tr>
								<td
									colSpan={5}
									className="bg-white px-6 py-8 text-center dark:bg-zinc-950"
								>
									<Spinner size="md" className="mx-auto text-primary" />
								</td>
							</tr>
						) : tenants.length === 0 ? (
							<tr>
								<td
									colSpan={5}
									className="px-6 py-4 text-center text-zinc-500 dark:text-zinc-400"
								>
									No tenants found
								</td>
							</tr>
						) : (
							tenants.map((tenant) => (
								<tr
									key={tenant.id}
									className="border-zinc-200 border-b bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
								>
									<td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">
										{tenant.name}
									</td>
									<td className="px-6 py-4">
										{tenant.status === "active" ? (
											<Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
												Active
											</Badge>
										) : (
											<Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">
												Suspended
											</Badge>
										)}
									</td>
									<td className="px-6 py-4 dark:text-zinc-300">
										{tenant.apiType}
									</td>
									<td className="px-6 py-4 dark:text-zinc-300">
										{tenant.tokenUsage}
									</td>
									<td className="space-x-2 px-6 py-4 text-right">
										<Button
											variant="outline"
											size="sm"
											disabled={pendingId === tenant.id}
											onClick={() => onImpersonate?.(tenant.id)}
										>
											{pendingId === tenant.id ? (
												<Spinner size="sm" className="mr-1" />
											) : null}
											Impersonate
										</Button>
										{tenant.status === "active" ? (
											<Button
												variant="outline"
												size="sm"
												className="text-red-600 hover:text-red-700 dark:text-red-500"
												disabled={pendingId === tenant.id}
												onClick={() => onSuspend?.(tenant.id)}
											>
												Suspend
											</Button>
										) : (
											<Button
												variant="outline"
												size="sm"
												className="text-green-600 hover:text-green-700 dark:text-green-500"
												disabled={pendingId === tenant.id}
												onClick={() => onReEnable?.(tenant.id)}
											>
												Re-enable
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
