import {
	Children,
	type HTMLAttributes,
	type ReactNode,
	useEffect,
	useRef,
} from "react"

interface WidgetMessageListProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode
}

/**
 * Scrollable container for messages.
 * Auto-scrolls to bottom on every message change.
 * Unstyled - consumers provide all styling.
 */
export function WidgetMessageList(props: WidgetMessageListProps) {
	const { children, ...divProps } = props
	const containerRef = useRef<HTMLDivElement>(null)
	const prevCountRef = useRef(0)
	const prevContentLenRef = useRef(0)

	useEffect(() => {
		const container = containerRef.current
		if (!container) return

		const count = Children.toArray(children).length
		const prevCount = prevCountRef.current
		prevCountRef.current = count

		// Compute total text length to catch streaming content updates
		let contentLen = 0
		for (const child of container.children) {
			contentLen += child.textContent?.length ?? 0
		}
		const prevContentLen = prevContentLenRef.current
		prevContentLenRef.current = contentLen

		const changed = count > prevCount || contentLen > prevContentLen
		if (!changed) return

		container.scrollTo({
			top: container.scrollHeight,
			behavior: "smooth",
		})
	}, [children])

	return (
		<div ref={containerRef} {...divProps}>
			{children}
		</div>
	)
}
