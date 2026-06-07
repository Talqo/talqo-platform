import type { ButtonHTMLAttributes, ReactNode } from "react"
import { useWidgetContext } from "./WidgetRoot"

interface WidgetSendButtonProps
	extends ButtonHTMLAttributes<HTMLButtonElement> {
	children?: ReactNode
}

/**
 * Button to send the current message
 * Unstyled - consumers provide all styling
 */
export function WidgetSendButton(props: WidgetSendButtonProps) {
	const { children, ...buttonProps } = props
	const { inputValue, sendMessage, isTyping } = useWidgetContext()
	const isDisabled = !inputValue.trim() || isTyping

	return (
		<button
			type="button"
			onClick={sendMessage}
			disabled={isDisabled}
			aria-label="Send message"
			{...buttonProps}
		>
			{children}
		</button>
	)
}
