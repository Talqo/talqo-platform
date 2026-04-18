import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { BackofficeLayout } from "@/components/layout"
import { useGuardedAuth } from "@/hooks/useGuardedAuth"
import { clearAdminToken, getAdminToken } from "@/lib/auth"
import { AUTH } from "@/lib/constants"

export const Route = createFileRoute("/backoffice")({
	component: BackofficeRoute,
})

function BackofficeRoute() {
	const { isLoading, isValid } = useGuardedAuth({
		getToken: getAdminToken,
		endpoint: "/admin/me",
		clearToken: clearAdminToken,
	})

	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		)
	}

	if (!isValid) {
		return <Navigate to={AUTH.LOGIN_ROUTE} replace />
	}

	return (
		<BackofficeLayout>
			<Outlet />
		</BackofficeLayout>
	)
}
