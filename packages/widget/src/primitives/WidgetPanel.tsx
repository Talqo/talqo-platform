import type { HTMLAttributes, ReactNode } from "react";
import { useWidgetContext } from "./WidgetRoot";

interface WidgetPanelProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
}

/**
 * Panel container for the chat interface
 * Only renders when widget is open
 */
export function WidgetPanel(props: WidgetPanelProps) {
	const { children, ...divProps } = props;
	const { isOpen } = useWidgetContext();

	if (!isOpen) return null;

	return (
		<div role="dialog" aria-modal="true" {...divProps}>
			{children}
		</div>
	);
}
