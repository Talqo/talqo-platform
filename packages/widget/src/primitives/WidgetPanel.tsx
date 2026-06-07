import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { useWidgetContext } from "./WidgetRoot"

interface WidgetPanelProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode
}

/**
 * Panel container for the chat interface
 * Only renders when widget is open
 */
export const WidgetPanel = forwardRef<HTMLDivElement, WidgetPanelProps>(
	function WidgetPanel(props, ref) {
		const { children, ...divProps } = props
		const { isOpen } = useWidgetContext()

		if (!isOpen) return null

		return (
			<div role="dialog" aria-modal="true" ref={ref} {...divProps}>
				{children}
			</div>
		)
	},
)
