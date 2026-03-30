import { Suspense } from "react";
import { LoadingOverlay } from "./ui/spinner";

/**
 * Suspense boundary wrapper with consistent loading state
 * Use this to wrap components that load data asynchronously
 */

interface SuspenseBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ReactNode;
}

export function SuspenseBoundary({
	children,
	fallback,
}: SuspenseBoundaryProps) {
	return (
		<Suspense
			fallback={fallback ?? <LoadingOverlay>Loading content...</LoadingOverlay>}
		>
			{children}
		</Suspense>
	);
}

/**
 * Route-level suspense boundary for TanStack Router
 * This is used in route configurations
 */
export function RouteSuspense({ children }: { children: React.ReactNode }) {
	return (
		<Suspense fallback={<LoadingOverlay>Loading page...</LoadingOverlay>}>
			{children}
		</Suspense>
	);
}
