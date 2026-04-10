import type { HTMLAttributes, ReactNode, RefObject } from "react"

interface WidgetMessageListProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode
	/** Ref to the scroll-to-bottom anchor element */
	scrollRef?: RefObject<HTMLDivElement | null>
}

/**
 * Scrollable container for messages
 * Unstyled - consumers provide all styling
 */
export function WidgetMessageList(props: WidgetMessageListProps) {
	const { children, scrollRef, ...divProps } = props
	return (
		<div {...divProps}>
			{children}
			<div ref={scrollRef} />
		</div>
	)
}
