import type { WidgetApiConfig, WidgetTheme } from "@/types"

export const DEFAULT_WELCOME_MESSAGE = "Hi! How can I help you today?"

export type MessageRole = "user" | "assistant"

export type Message = {
	id: string
	role: MessageRole
	content: string
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
