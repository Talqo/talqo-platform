import { useTranslation } from "react-i18next"
import type { ClientConversationSummary } from "shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

type ConversationsTableProps = {
	conversations?: ClientConversationSummary[]
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
	const { t } = useTranslation()

	return (
		<Card className="overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
			<div className="overflow-x-auto">
				<table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
					<thead className="border-zinc-200 border-b bg-zinc-50 text-xs text-zinc-700 uppercase dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
						<tr>
							<th scope="col" className="px-6 py-3">
								{t("dashboard.chatsTable.started")}
							</th>
							<th scope="col" className="px-6 py-3">
								{t("dashboard.chatsTable.messages")}
							</th>
							<th scope="col" className="px-6 py-3">
								{t("dashboard.chatsTable.rating")}
							</th>
							<th scope="col" className="px-6 py-3 text-right">
								{t("dashboard.chatsTable.preview")}
							</th>
						</tr>
					</thead>
					<tbody>
						{conversations === undefined ? (
							<tr>
								<td
									colSpan={4}
									className="bg-white px-6 py-8 text-center dark:bg-zinc-950"
								>
									<Spinner size="md" className="mx-auto text-primary" />
								</td>
							</tr>
						) : conversations.length === 0 ? (
							<tr>
								<td
									colSpan={4}
									className="px-6 py-4 text-center text-zinc-500 dark:text-zinc-400"
								>
									{t("dashboard.chatsTable.noConversationsFound")}
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
											{selectedId === conv.id
												? t("dashboard.chatsTable.close")
												: t("dashboard.chatsTable.view")}
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
