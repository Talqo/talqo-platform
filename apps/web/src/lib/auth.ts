/**
 * Auth utilities for token validation
 * Used by protected routes and auto-login functionality
 */
import { STORAGE_KEYS } from "./constants"

export interface TokenValidationResult {
	valid: boolean
	shouldClear: boolean
}

const VALIDATION_TIMEOUT_MS = 5000

/**
 * Validate a JWT token by making a request to the specified endpoint
 * @param token - The JWT token to validate
 * @param endpoint - The API endpoint to use for validation (e.g., "/client/me" or "/admin/me")
 * @returns Object containing whether token is valid and whether it should be cleared
 */
export async function validateToken(
	token: string,
	endpoint: string,
): Promise<TokenValidationResult> {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS)

	try {
		const response = await fetch(
			`${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}${endpoint}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
				signal: controller.signal,
			},
		)

		clearTimeout(timeoutId)

		if (response.ok) {
			return { valid: true, shouldClear: false }
		}

		// Only clear token on auth errors (401/403)
		// Network errors, 5xx, and other transport issues should keep the token
		const shouldClear = response.status === 401 || response.status === 403
		return { valid: false, shouldClear }
	} catch (error) {
		clearTimeout(timeoutId)

		// Handle timeout - treat as network error (don't clear token)
		if (error instanceof DOMException && error.name === "AbortError") {
			return { valid: false, shouldClear: false }
		}

		// Network or other transport errors - don't clear token, treat as retryable
		return { valid: false, shouldClear: false }
	}
}

/**
 * Get client token from storage
 */
export function getClientToken(): string | null {
	return localStorage.getItem(STORAGE_KEYS.TOKEN)
}

/**
 * Get admin token from storage
 */
export function getAdminToken(): string | null {
	return localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN)
}

/**
 * Clear client token from storage
 */
export function clearClientToken(): void {
	localStorage.removeItem(STORAGE_KEYS.TOKEN)
}

/**
 * Clear admin token from storage
 */
export function clearAdminToken(): void {
	localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN)
}
