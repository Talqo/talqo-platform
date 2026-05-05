/**
 * Auth utilities for token validation
 * Used by protected routes and auto-login functionality
 */
import { getApiBaseUrl } from "./api"
import { STORAGE_KEYS } from "./constants"

export type TokenValidationResult = {
	valid: boolean
	shouldClear: boolean
}

/** Valid endpoints for token validation */
export type AuthValidationEndpoint = "/client/me" | "/admin/me"

const VALIDATION_TIMEOUT_MS = 5000

/**
 * Runtime guard to check if a string is a valid AuthValidationEndpoint
 */
export function isValidAuthValidationEndpoint(
	value: string,
): value is AuthValidationEndpoint {
	return value === "/client/me" || value === "/admin/me"
}

/**
 * Validate a JWT token by making a request to the specified endpoint
 * @param token - The JWT token to validate
 * @param endpoint - The API endpoint to use for validation ("/client/me" or "/admin/me")
 * @returns Object containing whether token is valid and whether it should be cleared
 * @throws Error if endpoint is invalid or VITE_API_URL is not configured
 */
export async function validateToken(
	token: string,
	endpoint: AuthValidationEndpoint,
): Promise<TokenValidationResult> {
	// Runtime validation of endpoint
	if (!isValidAuthValidationEndpoint(endpoint)) {
		throw new Error(
			`Invalid endpoint: ${endpoint}. Must be "/client/me" or "/admin/me"`,
		)
	}

	const baseUrl = getApiBaseUrl()
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS)

	try {
		const response = await fetch(`${baseUrl}${endpoint}`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
			signal: controller.signal,
		})

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

		// Handle network failures - don't clear token, treat as retryable
		if (error instanceof TypeError) {
			return { valid: false, shouldClear: false }
		}

		// Rethrow unexpected errors (configuration errors, invalid endpoint, etc.)
		throw error
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
