import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useWidgetContext } from "./WidgetRoot";

interface WidgetTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	/** Content to render when chat is closed */
	closedContent?: ReactNode;
	/** Content to render when chat is open */
	openContent?: ReactNode;
}

/**
 * Trigger button for toggling the widget
 * Renders as an unstyled button - consumers provide all styling
 */
export function WidgetTrigger(props: WidgetTriggerProps) {
	const { closedContent, openContent, ...buttonProps } = props;
	const { isOpen, toggleOpen } = useWidgetContext();

	return (
		<button
			type="button"
			onClick={toggleOpen}
			aria-expanded={isOpen}
			aria-label={isOpen ? "Close chat" : "Open chat"}
			{...buttonProps}
		>
			{isOpen ? openContent : closedContent}
		</button>
	);
}
