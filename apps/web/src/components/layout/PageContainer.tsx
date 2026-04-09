import type { ReactNode } from "react";

interface PageContainerProps {
	children: ReactNode;
	className?: string;
}

export function PageContainer({
	children,
	className = "",
}: PageContainerProps) {
	return (
		<div className={`mx-auto max-w-5xl space-y-6 px-4 ${className}`}>
			{children}
		</div>
	);
}
