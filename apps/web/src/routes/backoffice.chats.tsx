import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import {
	useAdminConversation,
	useAdminConversations,
} from "@/api/hooks/useAdmin"
import { ConversationsTable } from "@/components/backoffice/ConversationsTable"
import { Badge } from "@/components/ui/badge"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

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
				<p className="whitespace-pre-wrap">{content}</p>
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
	const { data, isLoading, error } = useAdminConversation(conversationId)

	if (isLoading) {
		return (
			<div className="flex h-40 items-center justify-center">
				<Spinner size="md" className="text-primary" />
			</div>
		)
	}

	if (error) {
		return (
			<p className="py-6 text-center text-sm text-muted-foreground">
				Failed to load conversation
			</p>
		)
	}

	if (!data) return null

	return (
		<div className="space-y-2 p-4">
			{data.messages.length === 0 ? (
				<p className="text-center text-sm text-zinc-500">No messages</p>
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
	const {
		data: conversations,
		isLoading,
		error,
	} = useAdminConversations({ limit: 50 })
	const [selectedId, setSelectedId] = useState<string | undefined>()

	function handleSelect(id: string) {
		setSelectedId((prev) => (prev === id ? undefined : id))
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
				<p className="text-muted-foreground">Failed to load conversations</p>
			</div>
		)
	}

	const selected = conversations?.find((c) => c.id === selectedId)

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-bold text-3xl tracking-tight">Chat Previews</h1>
				<p className="text-muted-foreground">
					Browse and inspect end-user conversations (showing most recent 50)
				</p>
			</div>

			<ConversationsTable
				conversations={conversations}
				selectedId={selectedId}
				onSelect={handleSelect}
			/>

			{selected && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>
									{selected.clientName || selected.clientEmail}
								</CardTitle>
								<CardDescription>
									Started{" "}
									{new Date(selected.startedAt).toLocaleString(undefined, {
										dateStyle: "medium",
										timeStyle: "short",
									})}
								</CardDescription>
							</div>
							{selected.satisfactionRating != null && (
								<Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
									Rating: {selected.satisfactionRating} / 5
								</Badge>
							)}
						</div>
					</CardHeader>
					<CardContent>
						<ConversationPreview conversationId={selected.id} />
					</CardContent>
				</Card>
			)}
		</div>
	)
}
