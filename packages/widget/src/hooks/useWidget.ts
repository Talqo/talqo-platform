import { useCallback, useEffect, useRef, useState } from "react"
import type { WidgetTheme } from "@/types"
import { shouldShowRatingPrompt } from "./ratingTrigger"

export const DEFAULT_WELCOME_MESSAGE = "Hi! How can I help you today?"

export type { WidgetTheme }

export type MessageRole = "user" | "assistant"

export type Message = {
	id: string
	role: MessageRole
	content: string
}

export type WidgetApiConfig = {
	/** Widget token for API authentication */
	widgetToken: string
	/** API base URL for widget requests */
	apiUrl: string
}

export type UseWidgetOptions = {
	/** Initial open state */
	defaultOpen?: boolean
	/** Initial messages */
	initialMessages?: Message[]
	/** Position of the widget */
	position?: "left" | "right"
	/** Initial theme (defaults to light) */
	defaultTheme?: WidgetTheme
	/** API configuration for real backend calls */
	apiConfig: WidgetApiConfig
	/** Callback when widget is toggled */
	onOpenChange?: (isOpen: boolean) => void
}

export type UseWidgetReturn = {
	/** Whether the chat panel is currently open */
	isOpen: boolean
	/** Whether the chat panel is expanded */
	isExpanded: boolean
	/** Current input value */
	inputValue: string
	/** List of messages */
	messages: Message[]
	/** Whether bot is currently typing */
	isTyping: boolean
	/** Whether position is on the right side */
	isRightPosition: boolean
	/** Current theme */
	theme: WidgetTheme
	/** Whether current theme is dark */
	isDark: boolean
	/** Error message if any */
	error: string | null
	/** Toggle the chat panel open/closed */
	toggleOpen: () => void
	/** Set whether panel is open */
	setIsOpen: (value: boolean) => void
	/** Toggle expanded state */
	toggleExpanded: () => void
	/** Toggle theme between light and dark */
	toggleTheme: () => void
	/** Update input value */
	setInputValue: (value: string) => void
	/** Send the current message */
	sendMessage: () => void
	/** Clear all messages */
	clearMessages: () => void
	/** Clear the current error */
	clearError: () => void
	/** Whether to show the rating prompt */
	showRatingPrompt: boolean
	/** Whether a rating has been submitted */
	ratingSubmitted: boolean
	/** The rating value that was submitted (1-5), or null if not yet submitted */
	submittedRatingValue: number | null
	/** Submit a satisfaction rating */
	submitRating: (rating: number) => void
}

// Namespaced localStorage keys to avoid collisions with host pages
const THEME_STORAGE_KEY = "pagepal:widget:theme"
const BROWSER_SESSION_ID_KEY = "pagepal:widget:sessionId"

function safeGetItem(key: string): string | null {
	try {
		return localStorage.getItem(key)
	} catch {
		return null
	}
}

function safeSetItem(key: string, value: string): void {
	try {
		localStorage.setItem(key, value)
	} catch {
		// localStorage may be unavailable in restricted environments
	}
}

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function getOrCreateBrowserSessionId(): string {
	const existing = safeGetItem(BROWSER_SESSION_ID_KEY)
	if (existing && UUID_RE.test(existing)) return existing
	const id = crypto.randomUUID()
	safeSetItem(BROWSER_SESSION_ID_KEY, id)
	return id
}

// ─── API types ───────────────────────────────────────────────────────────────

type SessionData = {
	id: string
	browserSessionId: string
	clientId: string
	createdAt: string
	lastActiveAt: string
}

type ConversationData = {
	id: string
	sessionId: string
	clientId: string
	startedAt: string | null
	endedAt: string | null
	satisfactionRating: number | null
}

type MessageData = {
	id: string
	conversationId: string
	role: string
	content: string
	tokenCount: number
	createdAt: string
}

type ErrorBody = {
	error?: { message?: unknown }
}

type SseEvent =
	| { type: "user_message"; message: MessageData }
	| { type: "token"; content: string }
	| { type: "done"; message: MessageData }
	| { type: "error"; code: string; message: string }

// ─── API client ──────────────────────────────────────────────────────────────

class WidgetApi {
	constructor(private readonly config: WidgetApiConfig) {}

	private async parseErrorBody(res: Response): Promise<string> {
		const body = (await res.json().catch(() => ({}))) as ErrorBody
		return typeof body.error?.message === "string"
			? body.error.message
			: `HTTP ${res.status}`
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
			throw new Error(await this.parseErrorBody(res))
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
			throw new Error(await this.parseErrorBody(res))
		}

		const reader = res.body?.getReader()
		if (!reader) throw new Error("No response body")

		const decoder = new TextDecoder()
		let buffer = ""
		let gotTerminalEvent = false

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
					if (ev.type === "done" || ev.type === "error") gotTerminalEvent = true
				}
			}
			if (buffer.trim()) {
				const events = parseSseBuffer(`${buffer}\n\n`)
				for (const ev of events.items) {
					if (!ev) continue
					onEvent(ev)
					if (ev.type === "done" || ev.type === "error") gotTerminalEvent = true
				}
			}
			if (!gotTerminalEvent) {
				onEvent({
					type: "error",
					code: "STREAM_ENDED",
					message: "Connection lost. Please try again.",
				})
			}
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
			throw new Error(await this.parseErrorBody(res))
		}
	}
}

function parseSseBuffer(buffer: string): {
	items: (SseEvent | null)[]
	remainder: string
} {
	const events: (SseEvent | null)[] = []
	const rawEvents = buffer.split("\n\n")
	const remainder = rawEvents.pop() ?? ""
	for (const raw of rawEvents) {
		const lines = raw
			.split("\n")
			.map((l) => l.trim())
			.filter(Boolean)
		const eventName =
			lines
				.find((l) => l.startsWith("event:"))
				?.slice(6)
				.trim() ?? ""
		const dataLines = lines
			.filter((l) => l.startsWith("data:"))
			.map((l) => l.slice(5).trim())
		if (!dataLines.length) continue
		const dataStr = dataLines.join("\n")
		try {
			const payload = JSON.parse(dataStr) as Record<string, unknown>
			switch (eventName) {
				case "user_message":
					events.push({
						type: "user_message",
						message: payload as unknown as MessageData,
					})
					break
				case "token":
					events.push({
						type: "token",
						content: typeof payload.content === "string" ? payload.content : "",
					})
					break
				case "done":
					events.push({
						type: "done",
						message: payload as unknown as MessageData,
					})
					break
				case "error":
					events.push({
						type: "error",
						code: typeof payload.code === "string" ? payload.code : "UNKNOWN",
						message:
							typeof payload.message === "string" ? payload.message : "Error",
					})
					break
			}
		} catch {
			// ignore malformed event
		}
	}
	return { items: events, remainder }
}

// ─── Error mapping ───────────────────────────────────────────────────────────

function toUserFriendlyError(message: string): string {
	if (
		/HTTP 429/i.test(message) ||
		/rate.?limit/i.test(message) ||
		/too many/i.test(message)
	) {
		return "You've sent too many messages. Please wait a moment before trying again."
	}
	if (
		/HTTP 40[13]/i.test(message) ||
		/unauthorized/i.test(message) ||
		/forbidden/i.test(message)
	) {
		return "Unable to authenticate. Please refresh the page."
	}
	if (
		/HTTP 5\d\d/i.test(message) ||
		/server error/i.test(message) ||
		/no ai provider/i.test(message) ||
		/invalid provider config/i.test(message)
	) {
		return "The chat service is temporarily unavailable. Please try again shortly."
	}
	if (/HTTP \d+/i.test(message)) {
		return "Something went wrong. Please try again."
	}
	if (/no response body/i.test(message) || /failed to fetch/i.test(message)) {
		return "Unable to connect. Please check your connection and try again."
	}
	if (/failed to start conversation/i.test(message)) {
		return "Unable to start a new chat. Please refresh the page."
	}
	return message
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Headless hook for managing widget state with real API integration.
 * Extracts all logic from the UI so consumers can build their own interface.
 */
export function useWidget(options: UseWidgetOptions): UseWidgetReturn {
	const {
		defaultOpen = false,
		initialMessages = [
			{
				id: "welcome",
				role: "assistant",
				content: DEFAULT_WELCOME_MESSAGE,
			},
		],
		position = "right",
		defaultTheme = "light",
		apiConfig,
		onOpenChange,
	} = options

	const [isOpen, setIsOpenState] = useState(defaultOpen)
	const [isExpanded, setIsExpanded] = useState(false)
	const [inputValue, setInputValue] = useState("")
	const [messages, setMessages] = useState<Message[]>(initialMessages)
	const [isTyping, setIsTyping] = useState(false)
	const [theme, setTheme] = useState<WidgetTheme>(defaultTheme)
	const [error, setError] = useState<string | null>(null)
	const [showRatingPrompt, setShowRatingPrompt] = useState(false)
	const [ratingSubmitted, setRatingSubmitted] = useState(false)
	const [submittedRatingValue, setSubmittedRatingValue] = useState<
		number | null
	>(null)

	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const isRightPosition = position === "right"
	const isDark = theme === "dark"

	useEffect(() => {
		if (isTyping) {
			if (showRatingPrompt) setShowRatingPrompt(false)
		} else if (shouldShowRatingPrompt(messages, ratingSubmitted)) {
			setShowRatingPrompt(true)
		}
	}, [messages, ratingSubmitted, isTyping, showRatingPrompt])

	const { widgetToken, apiUrl } = apiConfig

	const apiRef = useRef<WidgetApi | null>(null)
	const sessionRef = useRef<SessionData | null>(null)
	const conversationRef = useRef<ConversationData | null>(null)
	const abortRef = useRef<AbortController | null>(null)

	useEffect(() => {
		apiRef.current = new WidgetApi({ widgetToken, apiUrl })
	}, [widgetToken, apiUrl])

	const browserSessionIdRef = useRef<string | null>(null)
	if (browserSessionIdRef.current === null) {
		browserSessionIdRef.current = getOrCreateBrowserSessionId()
	}

	const toggleTheme = useCallback(() => {
		setTheme((prev) => {
			const next = prev === "light" ? "dark" : "light"
			safeSetItem(THEME_STORAGE_KEY, next)
			return next
		})
	}, [])

	const setIsOpen = useCallback(
		(value: boolean) => {
			setIsOpenState(value)
			onOpenChange?.(value)
		},
		[onOpenChange],
	)

	const toggleOpen = useCallback(() => {
		setIsOpenState((prev) => {
			const next = !prev
			onOpenChange?.(next)
			return next
		})
	}, [onOpenChange])

	const toggleExpanded = useCallback(() => {
		setIsExpanded((prev) => !prev)
	}, [])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current)
			if (abortRef.current) abortRef.current.abort()
		}
	}, [])

	const sendMessage = useCallback(() => {
		const trimmedInput = inputValue.trim()
		if (!trimmedInput || isTyping) return

		const api = apiRef.current
		if (!api) return

		const doSend = (sessionId: string, conversationId: string) => {
			setError(null)
			setInputValue("")
			setIsTyping(true)

			const tempId = `temp-${crypto.randomUUID()}`
			const userMsg: Message = {
				id: tempId,
				role: "user",
				content: trimmedInput,
			}
			setMessages((prev) => [...prev, userMsg])

			const controller = new AbortController()
			abortRef.current = controller

			const recoverMessages = () => {
				api
					.getMessages(sessionId, conversationId)
					.then((serverMsgs) => {
						if (!serverMsgs.length) return
						setMessages((prev) => {
							const serverIds = new Set(serverMsgs.map((m) => m.id))
							const preserved = prev.filter(
								(m) => m.id === "welcome" || serverIds.has(m.id),
							)
							const preservedIds = new Set(preserved.map((m) => m.id))
							for (const msg of serverMsgs) {
								if (
									!preservedIds.has(msg.id) &&
									(msg.role === "user" || msg.role === "assistant")
								) {
									preserved.push({
										id: msg.id,
										role: msg.role,
										content: msg.content,
									})
								}
							}
							return preserved
						})
						const last = serverMsgs[serverMsgs.length - 1]
						if (last && last.role === "assistant") {
							setError(null)
							setIsTyping(false)
						}
					})
					.catch((err: unknown) => {
						setError(
							toUserFriendlyError(
								err instanceof Error ? err.message : String(err),
							),
						)
					})
			}

			api
				.sendMessage(
					sessionId,
					conversationId,
					trimmedInput,
					(event) => {
						switch (event.type) {
							case "user_message": {
								setMessages((prev) => {
									const withoutTemp = prev.filter((m) => m.id !== tempId)
									return [
										...withoutTemp,
										{
											id: event.message.id,
											role: event.message.role as MessageRole,
											content: event.message.content,
										},
									]
								})
								break
							}
							case "token": {
								setMessages((prev) => {
									const last = prev[prev.length - 1]
									if (last && last.role === "assistant") {
										return [
											...prev.slice(0, -1),
											{ ...last, content: last.content + event.content },
										]
									}
									return [
										...prev,
										{
											id: `stream-${crypto.randomUUID()}`,
											role: "assistant",
											content: event.content,
										},
									]
								})
								break
							}
							case "done": {
								setMessages((prev) => {
									const last = prev[prev.length - 1]
									if (
										last &&
										last.role === "assistant" &&
										last.id.startsWith("stream-")
									) {
										return [
											...prev.slice(0, -1),
											{
												id: event.message.id,
												role: "assistant",
												content: event.message.content,
											},
										]
									}
									return prev
								})
								setIsTyping(false)
								break
							}
							case "error": {
								setMessages((prev) =>
									prev.filter((m) => !m.id.startsWith("stream-")),
								)
								setError(event.message)
								setIsTyping(false)
								recoverMessages()
								break
							}
						}
					},
					controller.signal,
				)
				.catch((err: unknown) => {
					if (err instanceof Error && err.name === "AbortError") return
					setMessages((prev) => prev.filter((m) => !m.id.startsWith("stream-")))
					setError(
						toUserFriendlyError(
							err instanceof Error ? err.message : String(err),
						),
					)
					setIsTyping(false)
					recoverMessages()
				})
				.finally(() => {
					if (abortRef.current === controller) abortRef.current = null
				})
		}

		const sendWithSession = (sessionId: string) => {
			const conversation = conversationRef.current
			if (conversation) {
				doSend(sessionId, conversation.id)
			} else {
				api
					.startConversation(sessionId)
					.then((newConversation) => {
						conversationRef.current = newConversation
						doSend(sessionId, newConversation.id)
					})
					.catch((err: unknown) => {
						setError(
							toUserFriendlyError(
								err instanceof Error
									? err.message
									: "Failed to start conversation",
							),
						)
					})
			}
		}

		const session = sessionRef.current
		if (session) {
			sendWithSession(session.id)
		} else {
			api
				.createOrResumeSession(
					browserSessionIdRef.current ?? crypto.randomUUID(),
				)
				.then((newSession) => {
					sessionRef.current = newSession
					sendWithSession(newSession.id)
				})
				.catch((err: unknown) => {
					setError(
						toUserFriendlyError(
							err instanceof Error ? err.message : "Failed to connect to chat",
						),
					)
				})
		}
	}, [inputValue, isTyping])

	const submitRating = useCallback((rating: number) => {
		if (rating < 1 || rating > 5) return
		const session = sessionRef.current
		const conversation = conversationRef.current
		const api = apiRef.current
		if (!session || !conversation || !api) {
			setError("Chat is starting up. Please try again in a moment.")
			return
		}
		api
			.submitRating(session.id, conversation.id, rating)
			.then(() => {
				setRatingSubmitted(true)
				setSubmittedRatingValue(rating)
				timeoutRef.current = setTimeout(() => {
					setShowRatingPrompt(false)
				}, 2500)
			})
			.catch((err: unknown) => {
				setError(
					toUserFriendlyError(err instanceof Error ? err.message : String(err)),
				)
			})
	}, [])

	const clearMessages = useCallback(() => {
		if (abortRef.current) {
			abortRef.current.abort()
			abortRef.current = null
		}
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
			timeoutRef.current = null
		}
		setIsTyping(false)
		setError(null)
		setMessages([
			{
				id: "welcome",
				role: "assistant",
				content: DEFAULT_WELCOME_MESSAGE,
			},
		])
		setShowRatingPrompt(false)
		setRatingSubmitted(false)
		setSubmittedRatingValue(null)

		// Null out the ref — the next sendMessage will lazily create a new conversation
		conversationRef.current = null
	}, [])

	const clearError = useCallback(() => setError(null), [])

	return {
		isOpen,
		isExpanded,
		inputValue,
		messages,
		isTyping,
		isRightPosition,
		theme,
		isDark,
		error,
		toggleOpen,
		setIsOpen,
		toggleExpanded,
		toggleTheme,
		setInputValue,
		sendMessage,
		clearMessages,
		clearError,
		showRatingPrompt,
		ratingSubmitted,
		submittedRatingValue,
		submitRating,
	}
}

/**
 * Get the initial theme from localStorage or system preference
 * Uses namespaced key to avoid collisions with host pages
 */
export function getInitialTheme(): "light" | "dark" {
	if (typeof window === "undefined") return "light"

	const savedTheme = safeGetItem(THEME_STORAGE_KEY)
	if (savedTheme === "dark" || savedTheme === "light") {
		return savedTheme
	}

	if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
		return "dark"
	}

	return "light"
}
