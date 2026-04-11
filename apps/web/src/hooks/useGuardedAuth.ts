import { useEffect, useState } from "react"
import type { AuthValidationEndpoint } from "@/lib/auth"
import { validateToken } from "@/lib/auth"

interface UseGuardedAuthOptions {
	/** Function to get the token from storage */
	getToken: () => string | null
	/** Validation endpoint to use */
	endpoint: AuthValidationEndpoint
	/** Function to clear the token if invalid */
	clearToken: () => void
}

interface UseGuardedAuthResult {
	/** Whether auth check is in progress */
	isLoading: boolean
	/** Whether the token is valid */
	isValid: boolean
}

/**
 * Hook to guard a route based on token validity
 * Validates the token on mount and clears it if invalid (401/403)
 */
export function useGuardedAuth({
	getToken,
	endpoint,
	clearToken,
}: UseGuardedAuthOptions): UseGuardedAuthResult {
	const [isLoading, setIsLoading] = useState(true)
	const [isValid, setIsValid] = useState(false)

	useEffect(() => {
		const checkAuth = async () => {
			const token = getToken()

			if (!token) {
				setIsValid(false)
				setIsLoading(false)
				return
			}

			const { valid, shouldClear } = await validateToken(token, endpoint)
			if (shouldClear) {
				clearToken()
			}
			setIsValid(valid)
			setIsLoading(false)
		}

		checkAuth()
	}, [getToken, endpoint, clearToken])

	return { isLoading, isValid }
}
