import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router"
import { useCurrentAdmin } from "@/api/hooks/useAuth"
import { BackofficeLayout } from "@/components/layout"

export const Route = createFileRoute("/backoffice")({
	component: BackofficeRoute,
})

function BackofficeRoute() {
	const { data: admin, isLoading } = useCurrentAdmin()

	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		)
	}

	// Redirect to login if not authenticated as admin
	if (!admin) {
		return <Navigate to="/login" />
	}

	return (
		<BackofficeLayout>
			<Outlet />
		</BackofficeLayout>
	)
}
