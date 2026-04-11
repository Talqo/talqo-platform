import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { BackofficeLayout } from "@/components/layout"
import { AUTH, STORAGE_KEYS } from "@/lib/constants"

export const Route = createFileRoute("/backoffice")({
	component: BackofficeRoute,
})

async function validateAdminToken(
	token: string,
): Promise<{ valid: boolean; shouldClear: boolean }> {
	try {
		const response = await fetch(
			`${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/admin/me`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		)

		if (response.ok) {
			return { valid: true, shouldClear: false }
		}

		const shouldClear = response.status === 401 || response.status === 403
		return { valid: false, shouldClear }
	} catch {
		return { valid: false, shouldClear: false }
	}
}

function BackofficeRoute() {
	const [isLoading, setIsLoading] = useState(true)
	const [isValid, setIsValid] = useState(false)

	useEffect(() => {
		const checkAuth = async () => {
			const token = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN)

			if (!token) {
				setIsValid(false)
				setIsLoading(false)
				return
			}

			const { valid, shouldClear } = await validateAdminToken(token)
			if (shouldClear) {
				localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN)
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
