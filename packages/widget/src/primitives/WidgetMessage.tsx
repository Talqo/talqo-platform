import type { HTMLAttributes, ReactNode } from "react"

interface WidgetMessageProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode
	/** Role of the message sender */
	role: "user" | "bot"
}

/**
 * Individual message bubble
 * Unstyled - consumers provide all styling
 */
export function WidgetMessage(props: WidgetMessageProps) {
	const { children, role, ...divProps } = props
	return (
		<div data-role={role} {...divProps}>
			{children}
		</div>
	)
}
