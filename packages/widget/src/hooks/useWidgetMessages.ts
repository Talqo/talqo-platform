import { useCallback, useEffect, useRef, useState } from "react"
import { WidgetApi } from "@/api/client"
import type { ConversationData, SessionData } from "@/api/types"
import { toUserFriendlyError } from "@/lib/errors"
import { getOrCreateBrowserSessionId } from "@/lib/storage"
import type { WidgetApiConfig } from "@/types"
import type { Message, MessageRole } from "./types"
import { DEFAULT_WELCOME_MESSAGE } from "./types"

type UseWidgetMessagesOptions = {
	apiConfig: WidgetApiConfig
	initialMessages?: Message[]
	setError: (error: string | null) => void
}

export function useWidgetMessages(options: UseWidgetMessagesOptions) {
	const { apiConfig, initialMessages, setError } = options
	const { widgetToken, apiUrl } = apiConfig

	const [messages, setMessages] = useState<Message[]>(
		initialMessages ?? [
			{
				id: "welcome",
				role: "assistant",
				content: DEFAULT_WELCOME_MESSAGE,
			},
		],
	)
	const [isTyping, setIsTyping] = useState(false)

	const apiRef = useRef<WidgetApi | null>(null)
	const sessionRef = useRef<SessionData | null>(null)
	const conversationRef = useRef<ConversationData | null>(null)
	const abortRef = useRef<AbortController | null>(null)
	const browserSessionIdRef = useRef<string | null>(null)

	useEffect(() => {
		apiRef.current = new WidgetApi({ widgetToken, apiUrl })
	}, [widgetToken, apiUrl])

	if (browserSessionIdRef.current === null) {
		browserSessionIdRef.current = getOrCreateBrowserSessionId()
	}

	useEffect(() => {
		return () => {
			if (abortRef.current) abortRef.current.abort()
		}
	}, [])

	const sendMessage = useCallback(
		(trimmedInput: string) => {
			if (!trimmedInput || isTyping) return

			const api = apiRef.current
			if (!api) return

			const doSend = (sessionId: string, conversationId: string) => {
				setError(null)
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
												{
													...last,
													content: last.content + event.content,
												},
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
						setMessages((prev) =>
							prev.filter((m) => !m.id.startsWith("stream-")),
						)
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
								err instanceof Error
									? err.message
									: "Failed to connect to chat",
							),
						)
					})
			}
		},
		[isTyping, setError],
	)

	const clearMessages = useCallback(() => {
		if (abortRef.current) {
			abortRef.current.abort()
			abortRef.current = null
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

		// Null out the ref — the next sendMessage will lazily create a new conversation
		conversationRef.current = null
	}, [setError])

	return {
		messages,
		isTyping,
		sendMessage,
		clearMessages,
		apiRef,
		sessionRef,
		conversationRef,
		abortRef,
		browserSessionIdRef,
	}
}
