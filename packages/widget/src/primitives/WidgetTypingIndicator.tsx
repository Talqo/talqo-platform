import type { HTMLAttributes } from "react";

interface WidgetTypingIndicatorProps extends HTMLAttributes<HTMLDivElement> {
	/** Number of bouncing dots to show */
	dotCount?: number;
}

/**
 * Typing indicator with bouncing dots
 * Unstyled - consumers provide all styling
 */
export function WidgetTypingIndicator(props: WidgetTypingIndicatorProps) {
	const { dotCount = 3, ...divProps } = props;

	return (
		<div aria-live="polite" aria-atomic="true" {...divProps}>
			<span className="sr-only">Assistant is typing</span>
			{Array.from({ length: dotCount }, (_, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: Constant 1-3 dots, order fixed
					key={`dot-${i}`}
					style={{ animationDelay: `${i * 0.15}s` }}
					aria-hidden="true"
				/>
			))}
		</div>
	);
}
