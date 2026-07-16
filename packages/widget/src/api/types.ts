export type SessionData = {
	id: string
	browserSessionId: string
	clientId: string
	createdAt: string
	lastActiveAt: string
}

export type ConversationData = {
	id: string
	sessionId: string
	clientId: string
	startedAt: string | null
	endedAt: string | null
	satisfactionRating: number | null
}

export type MessageData = {
	id: string
	conversationId: string
	role: "user" | "assistant"
	content: string
	tokenCount: number
	createdAt: string
}

export type ErrorBody = {
	error?: { code?: unknown; message?: unknown }
}

export type SseEvent =
	| { type: "user_message"; message: MessageData }
	| { type: "token"; content: string }
	| { type: "done"; message: MessageData }
	| { type: "error"; code: string; message: string }
