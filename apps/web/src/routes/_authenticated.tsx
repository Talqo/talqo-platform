import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useGuardedAuth } from "@/hooks/useGuardedAuth"
import { clearClientToken, getClientToken } from "@/lib/auth"
import { AUTH } from "@/lib/constants"

export const Route = createFileRoute("/_authenticated")({
	component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
	const { isLoading, isValid } = useGuardedAuth({
		getToken: getClientToken,
		endpoint: "/client/me",
		clearToken: clearClientToken,
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

	return <Outlet />
}
