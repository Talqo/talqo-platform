import { Suspense } from "react"
import { useTranslation } from "react-i18next"
import { LoadingOverlay } from "./ui/spinner"

/**
 * Suspense boundary wrapper with consistent loading state
 * Use this to wrap components that load data asynchronously
 */

type SuspenseBoundaryProps = {
	children: React.ReactNode
	fallback?: React.ReactNode
}

export function SuspenseBoundary({
	children,
	fallback,
}: SuspenseBoundaryProps) {
	const { t } = useTranslation()

	return (
		<Suspense
			fallback={
				fallback ?? (
					<LoadingOverlay>
						{t("error.suspenseBoundary.loadingContent")}
					</LoadingOverlay>
				)
			}
		>
			{children}
		</Suspense>
	)
}

/**
 * Route-level suspense boundary for TanStack Router
 * This is used in route configurations
 */
export function RouteSuspense({ children }: { children: React.ReactNode }) {
	const { t } = useTranslation()

	return (
		<Suspense
			fallback={
				<LoadingOverlay>
					{t("error.suspenseBoundary.loadingPage")}
				</LoadingOverlay>
			}
		>
			{children}
		</Suspense>
	)
}
