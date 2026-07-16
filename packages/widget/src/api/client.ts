import type { WidgetApiConfig } from "@/types"
import { parseSseBuffer } from "./sse"
import type {
	ConversationData,
	ErrorBody,
	MessageData,
	SessionData,
	SseEvent,
} from "./types"

class WidgetApiError extends Error {
	constructor(
		public readonly code: string,
		message: string,
	) {
		super(message)
		this.name = "WidgetApiError"
	}
}

class WidgetApi {
	constructor(private readonly config: WidgetApiConfig) {}

	private async parseErrorBody(res: Response): Promise<WidgetApiError> {
		const body = (await res.json().catch(() => ({}))) as ErrorBody
		return new WidgetApiError(
			typeof body.error?.code === "string"
				? body.error.code
				: `HTTP_${res.status}`,
			typeof body.error?.message === "string"
				? body.error.message
				: `HTTP ${res.status}`,
		)
	}

	private async fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
		const url = `${this.config.apiUrl}${path}`
		const res = await fetch(url, {
			...options,
			headers: {
				"Content-Type": "application/json",
				"X-Widget-Token": this.config.widgetToken,
				...options?.headers,
			},
		})
		if (!res.ok) {
			throw await this.parseErrorBody(res)
		}
		return res.json() as Promise<T>
	}

	async createOrResumeSession(browserSessionId: string): Promise<SessionData> {
		return this.fetchJson<SessionData>("/widget/sessions", {
			method: "POST",
			body: JSON.stringify({ browserSessionId }),
		})
	}

	async startConversation(sessionId: string): Promise<ConversationData> {
		return this.fetchJson<ConversationData>(
			`/widget/sessions/${sessionId}/conversations`,
			{ method: "POST" },
		)
	}

	async getMessages(
		sessionId: string,
		conversationId: string,
	): Promise<MessageData[]> {
		return this.fetchJson<MessageData[]>(
			`/widget/sessions/${sessionId}/conversations/${conversationId}/messages`,
		)
	}

	async sendMessage(
		sessionId: string,
		conversationId: string,
		content: string,
		onEvent: (event: SseEvent) => void,
		signal?: AbortSignal,
	): Promise<void> {
		const url = `${this.config.apiUrl}/widget/sessions/${sessionId}/conversations/${conversationId}/messages`
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Widget-Token": this.config.widgetToken,
			},
			body: JSON.stringify({ content }),
			signal,
		})
		if (!res.ok) {
			throw await this.parseErrorBody(res)
		}

		const reader = res.body?.getReader()
		if (!reader) throw new Error("No response body")

		const decoder = new TextDecoder()
		let buffer = ""

		try {
			while (true) {
				const { done, value } = await reader.read()
				if (done) break
				buffer += decoder.decode(value, { stream: true })
				const events = parseSseBuffer(buffer)
				buffer = events.remainder
				for (const ev of events.items) {
					if (!ev) continue
					onEvent(ev)
					if (ev.type === "done" || ev.type === "error") {
						await reader.cancel().catch(() => {})
						return
					}
				}
			}
			if (buffer.trim()) {
				const events = parseSseBuffer(`${buffer}\n\n`)
				for (const ev of events.items) {
					if (!ev) continue
					onEvent(ev)
					if (ev.type === "done" || ev.type === "error") return
				}
			}
			onEvent({
				type: "error",
				code: "STREAM_ENDED",
				message: "Connection lost. Please try again.",
			})
		} finally {
			reader.releaseLock()
		}
	}

	async submitRating(
		sessionId: string,
		conversationId: string,
		rating: number,
	): Promise<void> {
		const url = `${this.config.apiUrl}/widget/sessions/${sessionId}/conversations/${conversationId}`
		const res = await fetch(url, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				"X-Widget-Token": this.config.widgetToken,
			},
			body: JSON.stringify({ rating }),
		})
		if (!res.ok) {
			throw await this.parseErrorBody(res)
		}
	}
}

export { parseSseBuffer } from "./sse"
export type { MessageData, SseEvent } from "./types"
export { WidgetApi, WidgetApiError }
