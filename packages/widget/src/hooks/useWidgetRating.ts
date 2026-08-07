import { useCallback, useEffect, useRef, useState } from "react"
import type { WidgetApi } from "@/api/client"
import type { ConversationData, SessionData } from "@/api/types"
import { toUserFriendlyError } from "@/lib/errors"
import { shouldShowRatingPrompt } from "./ratingTrigger"
import type { Message } from "./types"

type UseWidgetRatingOptions = {
	apiRef: React.RefObject<WidgetApi | null>
	sessionRef: React.RefObject<SessionData | null>
	conversationRef: React.RefObject<ConversationData | null>
	messages: Message[]
	isTyping: boolean
	setError: (error: string | null) => void
}

export function useWidgetRating(options: UseWidgetRatingOptions) {
	const { apiRef, sessionRef, conversationRef, messages, isTyping, setError } =
		options

	const [showRatingPrompt, setShowRatingPrompt] = useState(false)
	const [ratingSubmitted, setRatingSubmitted] = useState(false)
	const [submittedRatingValue, setSubmittedRatingValue] = useState<
		number | null
	>(null)

	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const submissionRef = useRef(0)

	useEffect(() => {
		if (isTyping) {
			submissionRef.current += 1
			if (showRatingPrompt) setShowRatingPrompt(false)
		} else if (shouldShowRatingPrompt(messages, ratingSubmitted)) {
			setShowRatingPrompt(true)
		}
	}, [messages, ratingSubmitted, isTyping, showRatingPrompt])

	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current)
		}
	}, [])

	const submitRating = useCallback(
		(rating: number) => {
			if (rating < 1 || rating > 5) return
			const session = sessionRef.current
			const conversation = conversationRef.current
			const api = apiRef.current
			if (!session || !conversation || !api) {
				setError("Chat is starting up. Please try again in a moment.")
				return
			}
			const submission = ++submissionRef.current
			api
				.submitRating(session.id, conversation.id, rating)
				.then(() => {
					if (submissionRef.current !== submission) return
					setError(null)
					setRatingSubmitted(true)
					setSubmittedRatingValue(rating)
					timeoutRef.current = setTimeout(() => {
						setShowRatingPrompt(false)
					}, 2500)
				})
				.catch((err: unknown) => {
					if (submissionRef.current === submission) {
						setError(toUserFriendlyError(err))
					}
				})
		},
		[apiRef, sessionRef, conversationRef, setError],
	)

	const clearRating = useCallback(() => {
		submissionRef.current += 1
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
			timeoutRef.current = null
		}
		setShowRatingPrompt(false)
		setRatingSubmitted(false)
		setSubmittedRatingValue(null)
	}, [])

	return {
		showRatingPrompt,
		ratingSubmitted,
		submittedRatingValue,
		submitRating,
		clearRating,
		timeoutRef,
	}
}
