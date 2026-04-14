import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

interface ConversationSummary {
	id: string
	clientId: string
	clientName: string | null
	clientEmail: string | null
	startedAt: string
	satisfactionRating: number | null
	messageCount: number
}

interface ConversationsTableProps {
	conversations?: ConversationSummary[]
	selectedId?: string
	onSelect: (id: string) => void
}

function formatDate(iso: string) {
	return new Date(iso).toLocaleString(undefined, {
		dateStyle: "short",
		timeStyle: "short",
	})
}

export function ConversationsTable({
	conversations,
	selectedId,
	onSelect,
}: ConversationsTableProps) {
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
								Started
							</th>
							<th scope="col" className="px-6 py-3">
								Messages
							</th>
							<th scope="col" className="px-6 py-3">
								Rating
							</th>
							<th scope="col" className="px-6 py-3 text-right">
								Preview
							</th>
						</tr>
					</thead>
					<tbody>
						{conversations === undefined ? (
							<tr>
								<td
									colSpan={5}
									className="bg-white px-6 py-8 text-center dark:bg-zinc-950"
								>
									<Spinner size="md" className="mx-auto text-primary" />
								</td>
							</tr>
						) : conversations.length === 0 ? (
							<tr>
								<td
									colSpan={5}
									className="px-6 py-4 text-center text-zinc-500 dark:text-zinc-400"
								>
									No conversations found
								</td>
							</tr>
						) : (
							conversations.map((conv) => (
								<tr
									key={conv.id}
									className={`border-zinc-200 border-b bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900 ${
										selectedId === conv.id
											? "ring-2 ring-primary ring-inset"
											: ""
									}`}
								>
									<td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">
										{conv.clientName || conv.clientEmail || conv.clientId}
									</td>
									<td className="px-6 py-4 dark:text-zinc-300">
										{formatDate(conv.startedAt)}
									</td>
									<td className="px-6 py-4 dark:text-zinc-300">
										{conv.messageCount}
									</td>
									<td className="px-6 py-4">
										{conv.satisfactionRating != null ? (
											<Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400">
												{conv.satisfactionRating} / 5
											</Badge>
										) : (
											<span className="text-zinc-400">—</span>
										)}
									</td>
									<td className="px-6 py-4 text-right">
										<Button
											variant="outline"
											size="sm"
											onClick={() => onSelect(conv.id)}
										>
											{selectedId === conv.id ? "Close" : "View"}
										</Button>
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
