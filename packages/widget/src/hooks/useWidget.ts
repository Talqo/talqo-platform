import { useCallback, useEffect, useRef, useState } from "react"

export type WidgetTheme = "light" | "dark"

export interface Message {
	id: string
	role: "user" | "bot"
	content: string
}

export interface UseWidgetOptions {
	/** Initial open state */
	defaultOpen?: boolean
	/** Initial messages */
	initialMessages?: Message[]
	/** Position of the widget */
	position?: "left" | "right"
	/** Initial theme (defaults to light) */
	defaultTheme?: WidgetTheme
	/** Callback when message is sent */
	onMessageSend?: (message: string) => void | Promise<void>
	/** Callback when widget is toggled */
	onOpenChange?: (isOpen: boolean) => void
}

export interface UseWidgetReturn {
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
}

/**
 * Headless hook for managing widget state
 * Extracts all logic from the UI so consumers can build their own interface
 */
export function useWidget(options: UseWidgetOptions = {}): UseWidgetReturn {
	const {
		defaultOpen = false,
		initialMessages = [
			{
				id: "welcome",
				role: "bot",
				content: "Hi! How can I help you today?",
			},
		],
		position = "right",
		defaultTheme = "light",
		onOpenChange,
	} = options

	const [isOpen, setIsOpenState] = useState(defaultOpen)
	const [isExpanded, setIsExpanded] = useState(false)
	const [inputValue, setInputValue] = useState("")
	const [messages, setMessages] = useState<Message[]>(initialMessages)
	const [isTyping, setIsTyping] = useState(false)
	const [theme, setTheme] = useState<WidgetTheme>(defaultTheme)
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const isRightPosition = position === "right"
	const isDark = theme === "dark"

	const toggleTheme = useCallback(() => {
		setTheme((prev) => (prev === "light" ? "dark" : "light"))
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

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	const sendMessage = useCallback(() => {
		const trimmedInput = inputValue.trim()
		if (!trimmedInput || isTyping) return

		const userMsg: Message = {
			id: Date.now().toString(),
			role: "user",
			content: trimmedInput,
		}
		setMessages((prev) => [...prev, userMsg])
		setInputValue("")
		setIsTyping(true)

		// Simulate bot response - replace with actual API call
		timeoutRef.current = setTimeout(() => {
			const botMsg: Message = {
				id: (Date.now() + 1).toString(),
				role: "bot",
				content: "Thanks for your message! Our team will get back to you soon.",
			}
			setMessages((prev) => [...prev, botMsg])
			setIsTyping(false)
			timeoutRef.current = null
		}, 1500)
	}, [inputValue, isTyping])

	const clearMessages = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
			timeoutRef.current = null
		}
		setIsTyping(false)
		setMessages([
			{
				id: "welcome",
				role: "bot",
				content: "Hi! How can I help you today?",
			},
		])
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
		toggleOpen,
		setIsOpen,
		toggleExpanded,
		toggleTheme,
		setInputValue,
		sendMessage,
		clearMessages,
	}
}
