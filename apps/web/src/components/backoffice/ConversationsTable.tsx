import { useTranslation } from "react-i18next"
import type { ConversationSummary } from "shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

// py-4 (16px × 2) + h-9 button (36px) + 1px border
const ROW_HEIGHT = 69
// py-3 (12px × 2) + text-xs line-height (16px) + 1px border
const HEADER_HEIGHT = 41
// py-3 (12px × 2) + h-9 button (36px) + 1px border-t
const FOOTER_HEIGHT = 61

export function getTablePanelHeight(pageSize: number): number {
	return HEADER_HEIGHT + pageSize * ROW_HEIGHT + FOOTER_HEIGHT
}

type ConversationsTableProps = {
	conversations?: ConversationSummary[]
	selectedId?: string
	onSelect: (id: string) => void
	pageSize?: number
	pagination?: {
		page: number
		hasNextPage: boolean
		onPrev: () => void
		onNext: () => void
	}
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
	pageSize,
	pagination,
}: ConversationsTableProps) {
	const { t } = useTranslation()

	return (
		<Card className="flex flex-col overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
			<div
				className="overflow-y-auto overflow-x-auto"
				style={
					pageSize !== undefined
						? { height: HEADER_HEIGHT + pageSize * ROW_HEIGHT }
						: undefined
				}
			>
				<table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
					<thead className="sticky top-0 border-zinc-200 border-b bg-zinc-50 text-xs text-zinc-700 uppercase dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
						<tr>
							<th scope="col" className="px-6 py-3">
								{t("backoffice.conversationsTable.client")}
							</th>
							<th scope="col" className="px-6 py-3">
								{t("backoffice.conversationsTable.started")}
							</th>
							<th scope="col" className="px-6 py-3">
								{t("backoffice.conversationsTable.messages")}
							</th>
							<th scope="col" className="px-6 py-3">
								{t("backoffice.conversationsTable.rating")}
							</th>
							<th scope="col" className="px-6 py-3 text-right">
								{t("backoffice.conversationsTable.preview")}
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
									{t("backoffice.conversationsTable.noConversationsFound")}
								</td>
							</tr>
						) : (
							conversations.map((conv, index) => (
								<tr
									key={conv.id}
									style={{ height: ROW_HEIGHT }}
									className={`bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900 ${
										pageSize === undefined || index < pageSize - 1
											? "border-zinc-200 border-b dark:border-zinc-800"
											: ""
									} ${
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
											{selectedId === conv.id
												? t("backoffice.conversationsTable.close")
												: t("backoffice.conversationsTable.view")}
										</Button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
			{pagination && (
				<div className="flex items-center justify-between border-zinc-200 border-t px-4 py-3 dark:border-zinc-800">
					<span className="text-muted-foreground text-xs">
						{t("backoffice.conversationsTable.pagination.page", {
							page: pagination.page + 1,
						})}
					</span>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={pagination.onPrev}
							disabled={pagination.page === 0}
						>
							{t("backoffice.conversationsTable.pagination.previous")}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={pagination.onNext}
							disabled={!pagination.hasNextPage}
						>
							{t("backoffice.conversationsTable.pagination.next")}
						</Button>
					</div>
				</div>
			)}
		</Card>
	)
}
