import { useCallback, useEffect, useRef, useState } from "react"
import { shouldShowRatingPrompt } from "./ratingTrigger"

export const DEFAULT_WELCOME_MESSAGE = "Hi! How can I help you today?"

export type WidgetTheme = "light" | "dark"

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
	/** Whether to show the rating prompt */
	showRatingPrompt: boolean
	/** Whether a rating has been submitted */
	ratingSubmitted: boolean
	/** Submit a satisfaction rating */
	submitRating: (rating: number) => void
}

// Namespaced localStorage key to avoid collisions with host pages
const THEME_STORAGE_KEY = "pagepal:widget:theme"
const SESSION_STORAGE_KEY = "pagepal:widget:session"

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
		return this.fetchJson<SessionData>("/v1/widget/sessions", {
			method: "POST",
			body: JSON.stringify({ browserSessionId }),
		})
	}

	async startConversation(sessionId: string): Promise<ConversationData> {
		return this.fetchJson<ConversationData>(
			`/v1/widget/sessions/${sessionId}/conversations`,
			{ method: "POST" },
		)
	}

	async sendMessage(
		sessionId: string,
		conversationId: string,
		content: string,
		onEvent: (event: SseEvent) => void,
		signal?: AbortSignal,
	): Promise<void> {
		const url = `${this.config.apiUrl}/v1/widget/sessions/${sessionId}/conversations/${conversationId}/messages`
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
		const url = `${this.config.apiUrl}/v1/widget/sessions/${sessionId}/conversations/${conversationId}`
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

	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const isRightPosition = position === "right"
	const isDark = theme === "dark"

	useEffect(() => {
		if (shouldShowRatingPrompt(messages, ratingSubmitted)) {
			setShowRatingPrompt(true)
		}
	}, [messages, ratingSubmitted])

	const { widgetToken, apiUrl } = apiConfig

	const apiRef = useRef<WidgetApi | null>(null)
	const sessionRef = useRef<SessionData | null>(null)
	const conversationRef = useRef<ConversationData | null>(null)
	const abortRef = useRef<AbortController | null>(null)

	useEffect(() => {
		apiRef.current = new WidgetApi({ widgetToken, apiUrl })
	}, [widgetToken, apiUrl])

	// Initialize session on mount (or when api config changes)
	useEffect(() => {
		let cancelled = false

		const stored = safeGetItem(SESSION_STORAGE_KEY)
		let browserSessionId: string
		try {
			const parsed = stored ? (JSON.parse(stored) as unknown) : null
			if (
				parsed &&
				typeof parsed === "object" &&
				"browserSessionId" in parsed &&
				typeof (parsed as Record<string, unknown>).browserSessionId === "string"
			) {
				browserSessionId = (parsed as Record<string, unknown>)
					.browserSessionId as string
			} else {
				browserSessionId = crypto.randomUUID()
			}
		} catch {
			browserSessionId = crypto.randomUUID()
		}

		const api = apiRef.current ?? new WidgetApi({ widgetToken, apiUrl })
		if (!apiRef.current) apiRef.current = api

		api
			.createOrResumeSession(browserSessionId)
			.then((session) => {
				if (cancelled) return
				sessionRef.current = session
				safeSetItem(SESSION_STORAGE_KEY, JSON.stringify(session))
				return api.startConversation(session.id)
			})
			.then((conversation) => {
				if (cancelled || !conversation) return
				conversationRef.current = conversation
			})
			.catch((err) => {
				if (!cancelled)
					setError(err instanceof Error ? err.message : String(err))
			})

		return () => {
			cancelled = true
		}
	}, [widgetToken, apiUrl])

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

		const session = sessionRef.current
		const conversation = conversationRef.current
		const api = apiRef.current
		if (!session || !conversation || !api) {
			setError("Chat not initialized yet. Please wait.")
			return
		}

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

		api
			.sendMessage(
				session.id,
				conversation.id,
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
							break
						}
					}
				},
				controller.signal,
			)
			.catch((err: unknown) => {
				if (err instanceof Error && err.name === "AbortError") return
				setMessages((prev) => prev.filter((m) => !m.id.startsWith("stream-")))
				setError(err instanceof Error ? err.message : String(err))
				setIsTyping(false)
			})
			.finally(() => {
				if (abortRef.current === controller) abortRef.current = null
			})
	}, [inputValue, isTyping])

	const submitRating = useCallback((rating: number) => {
		if (rating < 1 || rating > 5) {
			setError("Rating must be between 1 and 5")
			return
		}
		const session = sessionRef.current
		const conversation = conversationRef.current
		const api = apiRef.current
		if (!session || !conversation || !api) {
			setError("Chat not initialized yet. Please wait.")
			return
		}
		api
			.submitRating(session.id, conversation.id, rating)
			.then(() => {
				setRatingSubmitted(true)
				setShowRatingPrompt(false)
			})
			.catch((err: unknown) => {
				setError(err instanceof Error ? err.message : String(err))
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

		// Start a fresh conversation
		conversationRef.current = null
		const session = sessionRef.current
		const api = apiRef.current
		if (session && api) {
			api
				.startConversation(session.id)
				.then((conversation) => {
					conversationRef.current = conversation
				})
				.catch((err) => {
					setError(
						err instanceof Error ? err.message : "Failed to start conversation",
					)
				})
		}
	}, [])

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
		showRatingPrompt,
		ratingSubmitted,
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
