import { cn } from "@/lib/utils";

/**
 * Loading spinner component
 */

interface SpinnerProps {
	size?: "sm" | "md" | "lg";
	className?: string;
}

const sizeClasses = {
	sm: "h-4 w-4 border-2",
	md: "h-6 w-6 border-2",
	lg: "h-8 w-8 border-4",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
	return (
		<output
			aria-label="Loading"
			className={cn(
				"animate-spin rounded-full border-current border-t-transparent",
				sizeClasses[size],
				className,
			)}
		/>
	);
}

interface LoadingOverlayProps {
	children?: React.ReactNode;
	className?: string;
}

export function LoadingOverlay({ children, className }: LoadingOverlayProps) {
	return (
		<div
			className={cn(
				"flex min-h-[200px] flex-col items-center justify-center gap-4",
				className,
			)}
		>
			<Spinner size="lg" className="text-primary" />
			{children && <p className="text-muted-foreground text-sm">{children}</p>}
		</div>
	);
}
