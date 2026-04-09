import type { HTMLAttributes, ReactNode } from "react";

interface WidgetHeaderProps extends HTMLAttributes<HTMLElement> {
	children: ReactNode;
}

/**
 * Header section of the widget panel
 * Unstyled - consumers provide all styling
 */
export function WidgetHeader(props: WidgetHeaderProps) {
	const { children, ...headerProps } = props;
	return <header {...headerProps}>{children}</header>;
}
