import { useCallback, useState } from "react"
import type { UseWidgetOptions, UseWidgetReturn } from "./types"

export type { UseWidgetOptions, UseWidgetReturn } from "./types"

import { useWidgetMessages } from "./useWidgetMessages"
import { useWidgetRating } from "./useWidgetRating"
import { useWidgetUI } from "./useWidgetUI"

/**
 * Headless hook for managing widget state with real API integration.
 * Extracts all logic from the UI so consumers can build their own interface.
 */
export function useWidget(options: UseWidgetOptions): UseWidgetReturn {
	const ui = useWidgetUI(options)

	const [error, setError] = useState<string | null>(null)
	const clearError = useCallback(() => setError(null), [])

	const messages = useWidgetMessages({
		apiConfig: options.apiConfig,
		initialMessages: options.initialMessages,
		setError,
	})

	const rating = useWidgetRating({
		apiRef: messages.apiRef,
		sessionRef: messages.sessionRef,
		conversationRef: messages.conversationRef,
		messages: messages.messages,
		isTyping: messages.isTyping,
		setError,
	})

	const sendMessage = useCallback(() => {
		const trimmedInput = ui.inputValue.trim()
		if (!trimmedInput || messages.isTyping) return
		ui.setInputValue("")
		messages.sendMessage(trimmedInput)
	}, [ui.inputValue, messages.isTyping, ui.setInputValue, messages.sendMessage])

	const clearMessages = useCallback(() => {
		messages.clearMessages()
		rating.clearRating()
	}, [messages.clearMessages, rating.clearRating])

	return {
		isOpen: ui.isOpen,
		isExpanded: ui.isExpanded,
		inputValue: ui.inputValue,
		messages: messages.messages,
		isTyping: messages.isTyping,
		isRightPosition: ui.isRightPosition,
		theme: ui.theme,
		isDark: ui.isDark,
		error,
		toggleOpen: ui.toggleOpen,
		setIsOpen: ui.setIsOpen,
		toggleExpanded: ui.toggleExpanded,
		toggleTheme: ui.toggleTheme,
		setInputValue: ui.setInputValue,
		sendMessage,
		clearMessages,
		clearError,
		showRatingPrompt: rating.showRatingPrompt,
		ratingSubmitted: rating.ratingSubmitted,
		submittedRatingValue: rating.submittedRatingValue,
		submitRating: rating.submitRating,
	}
}
