import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { BackofficeLayout } from "@/components/layout"
import { clearAdminToken, getAdminToken, validateToken } from "@/lib/auth"
import { AUTH } from "@/lib/constants"

export const Route = createFileRoute("/backoffice")({
	component: BackofficeRoute,
})

function BackofficeRoute() {
	const [isLoading, setIsLoading] = useState(true)
	const [isValid, setIsValid] = useState(false)

	useEffect(() => {
		const checkAuth = async () => {
			const token = getAdminToken()

			if (!token) {
				setIsValid(false)
				setIsLoading(false)
				return
			}

			const { valid, shouldClear } = await validateToken(token, "/admin/me")
			if (shouldClear) {
				clearAdminToken()
			}
			setIsValid(valid)
			setIsLoading(false)
		}

		checkAuth()
	}, [])

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
