import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"

const PAGE_SIZE = 10

import { useTranslation } from "react-i18next"
import {
	useClientConversation,
	useClientConversations,
} from "@/api/hooks/useClientAccount"
import { MarkdownContent } from "@/components/backoffice"
import {
	ConversationsTable,
	getTablePanelHeight,
} from "@/components/conversations/ConversationsTable"
import { PageHeader } from "@/components/layout"
import { Badge } from "@/components/ui/badge"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

export const Route = createFileRoute("/_authenticated/dashboard/chats")({
	component: ChatsPage,
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

function ConversationPreview({ conversationId }: { conversationId: string }) {
	const { t } = useTranslation()
	const { data, isLoading, error } = useClientConversation(conversationId)

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
				{t("dashboard.chats.failedToLoadConversation")}
			</p>
		)
	}

	if (!data) return null

	return (
		<div className="space-y-2 p-4">
			{data.messages.length === 0 ? (
				<p className="text-center text-sm text-zinc-500">
					{t("dashboard.chats.noMessages")}
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

function ChatsPage() {
	const { t } = useTranslation()
	const [page, setPage] = useState(0)
	const [selectedId, setSelectedId] = useState<string | undefined>()

	const {
		data: conversations,
		isLoading,
		error,
	} = useClientConversations({ limit: PAGE_SIZE + 1, offset: page * PAGE_SIZE })

	function handleSelect(id: string) {
		setSelectedId((prev) => (prev === id ? undefined : id))
	}

	function handlePrev() {
		setPage((p) => p - 1)
		setSelectedId(undefined)
	}

	function handleNext() {
		setPage((p) => p + 1)
		setSelectedId(undefined)
	}

	if (isLoading) {
		return (
			<div className="flex h-[400px] items-center justify-center">
				<Spinner size="lg" className="text-primary" />
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex h-[400px] items-center justify-center">
				{t("dashboard.chats.failedToLoadConversations")}
			</div>
		)
	}

	const hasNextPage = (conversations?.length ?? 0) > PAGE_SIZE
	const displayedConversations = conversations?.slice(0, PAGE_SIZE)
	const selected = displayedConversations?.find((c) => c.id === selectedId)

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title={t("dashboard.chats.title")}
				subtitle={t("dashboard.chats.subtitle")}
			/>

			<div
				className="grid grid-cols-[1fr_1.2fr] gap-6"
				style={{ height: getTablePanelHeight(PAGE_SIZE) }}
			>
				<div className="min-h-0 min-w-0 h-full">
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

				<div className="min-h-0 min-w-0 h-full">
					{selected ? (
						<Card className="flex h-full flex-col">
							<CardHeader>
								<div className="flex items-center justify-between">
									<div>
										<CardTitle>{t("dashboard.chats.conversation")}</CardTitle>
										<CardDescription>
											{t("dashboard.chats.started")}{" "}
											{new Date(selected.startedAt).toLocaleString(undefined, {
												dateStyle: "medium",
												timeStyle: "short",
											})}
										</CardDescription>
									</div>
									{selected.satisfactionRating != null && (
										<Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
											{t("backoffice.conversationsTable.ratingLabel")}:{" "}
											{selected.satisfactionRating} / 5
										</Badge>
									)}
								</div>
							</CardHeader>
							<CardContent className="min-h-0 flex-1 overflow-y-auto">
								<ConversationPreview conversationId={selected.id} />
							</CardContent>
						</Card>
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
