import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { clearClientToken, getClientToken, validateToken } from "@/lib/auth"
import { AUTH } from "@/lib/constants"

export const Route = createFileRoute("/_authenticated")({
	component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
	const [isLoading, setIsLoading] = useState(true)
	const [isValid, setIsValid] = useState(false)

	useEffect(() => {
		const checkAuth = async () => {
			const token = getClientToken()

			if (!token) {
				setIsValid(false)
				setIsLoading(false)
				return
			}

			const { valid, shouldClear } = await validateToken(token, "/client/me")
			if (shouldClear) {
				// Token is invalid, clear it
				clearClientToken()
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

	return <Outlet />
}
