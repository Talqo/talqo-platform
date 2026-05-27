import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
	useAdminConversation,
	useAdminConversations,
} from "@/api/hooks/useAdmin"
import { MarkdownContent } from "@/components/backoffice"
import {
	ConversationsTable,
	getTablePanelHeight,
} from "@/components/backoffice/ConversationsTable"
import { Badge } from "@/components/ui/badge"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

const PAGE_SIZE = 10

export const Route = createFileRoute("/backoffice/chats")({
	component: BackofficeChatsPage,
})

function MessageBubble({
	role,
	content,
	createdAt,
}: {
	role: string
	content: string
	createdAt: string
}) {
	const isUser = role === "user"
	return (
		<div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
			<div
				className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${
					isUser
						? "bg-primary text-primary-foreground"
						: role === "system"
							? "bg-zinc-200 text-zinc-600 italic dark:bg-zinc-800 dark:text-zinc-400"
							: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
				}`}
			>
				{role === "assistant" ? (
					<MarkdownContent content={content} />
				) : (
					<p className="whitespace-pre-wrap">{content}</p>
				)}
				<p className="mt-1 text-right text-[10px] opacity-60">
					{new Date(createdAt).toLocaleTimeString(undefined, {
						timeStyle: "short",
					})}
				</p>
			</div>
		</div>
	)
}

function SelectedConversationCard({
	conversationId,
}: {
	conversationId: string
}) {
	const { t } = useTranslation()
	const { data } = useAdminConversation(conversationId)

	return (
		<Card className="flex h-full flex-col">
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>
							{data
								? data.clientName || data.clientEmail || data.clientId
								: null}
						</CardTitle>
						{data && (
							<CardDescription>
								{t("backoffice.conversationsTable.started")}{" "}
								{new Date(data.startedAt).toLocaleString(undefined, {
									dateStyle: "medium",
									timeStyle: "short",
								})}
							</CardDescription>
						)}
					</div>
					{data?.satisfactionRating != null && (
						<Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
							{t("backoffice.conversationsTable.ratingLabel")}:{" "}
							{data.satisfactionRating} / 5
						</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent className="min-h-0 flex-1 overflow-y-auto">
				<ConversationPreview conversationId={conversationId} />
			</CardContent>
		</Card>
	)
}

function ConversationPreview({ conversationId }: { conversationId: string }) {
	const { data, isLoading, error } = useAdminConversation(conversationId)
	const { t } = useTranslation()

	if (isLoading) {
		return (
			<div className="flex h-40 items-center justify-center">
				<Spinner size="md" className="text-primary" />
			</div>
		)
	}

	if (error) {
		return (
			<p className="py-6 text-center text-muted-foreground text-sm">
				{t("backoffice.conversationsTable.failedToLoadConversation")}
			</p>
		)
	}

	if (!data) return null

	return (
		<div className="space-y-2 p-4">
			{data.messages.length === 0 ? (
				<p className="text-center text-sm text-zinc-500">
					{t("backoffice.conversationsTable.noMessages")}
				</p>
			) : (
				data.messages.map((msg) => (
					<MessageBubble
						key={msg.id}
						role={msg.role}
						content={msg.content}
						createdAt={msg.createdAt}
					/>
				))
			)}
		</div>
	)
}

function BackofficeChatsPage() {
	const { t } = useTranslation()
	const [page, setPage] = useState(0)
	const [selectedId, setSelectedId] = useState<string | undefined>()

	const {
		data: conversations,
		isLoading,
		error,
	} = useAdminConversations({ limit: PAGE_SIZE + 1, offset: page * PAGE_SIZE })

	function handleSelect(id: string) {
		setSelectedId((prev) => (prev === id ? undefined : id))
	}

	function handlePrev() {
		setPage((p) => p - 1)
	}

	function handleNext() {
		setPage((p) => p + 1)
	}

	if (isLoading) {
		return (
			<div className="flex min-h-[300px] flex-1 items-center justify-center">
				<Spinner size="lg" className="text-primary" />
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex min-h-[300px] flex-1 items-center justify-center">
				<p className="text-muted-foreground">
					{t("backoffice.stats.failedToLoadConversations")}
				</p>
			</div>
		)
	}

	const hasNextPage = (conversations?.length ?? 0) > PAGE_SIZE
	const displayedConversations = conversations?.slice(0, PAGE_SIZE)

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="font-bold text-3xl tracking-tight">
					{t("backoffice.conversationsTable.chatPreviews")}
				</h1>
				<p className="text-muted-foreground">
					{t("backoffice.conversationsTable.chatPreviewsDescription")}
				</p>
			</div>

			<div
				className="grid grid-cols-[1fr_1.2fr] gap-6"
				style={{ height: getTablePanelHeight(PAGE_SIZE) }}
			>
				<div className="h-full min-h-0 min-w-0">
					<ConversationsTable
						conversations={displayedConversations}
						selectedId={selectedId}
						onSelect={handleSelect}
						pageSize={PAGE_SIZE}
						pagination={{
							page,
							hasNextPage,
							onPrev: handlePrev,
							onNext: handleNext,
						}}
					/>
				</div>

				<div className="h-full min-h-0 min-w-0">
					{selectedId ? (
						<SelectedConversationCard conversationId={selectedId} />
					) : (
						<div className="flex h-full items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
							{t("backoffice.conversationsTable.selectConversationPlaceholder")}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
