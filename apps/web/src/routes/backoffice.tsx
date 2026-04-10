import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router"
import { useCurrentUser } from "@/api/hooks/useAuth"
import { DashboardLayout } from "@/components/layout"

export const Route = createFileRoute("/backoffice")({
	component: BackofficeLayout,
})

function BackofficeLayout() {
	const { data: user, isLoading } = useCurrentUser()

	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		)
	}

	// Redirect to login if not authenticated
	if (!user) {
		return <Navigate to="/login" />
	}

	// TODO: Check if user is admin - for now just render
	return (
		<DashboardLayout>
			<Outlet />
		</DashboardLayout>
	)
}
