import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useRef, useState } from "react"
import { client } from "@/api/client"
import { AUTH } from "@/lib/constants"

// Types from OpenAPI spec
type LoginRequest = {
	email: string
	password: string
}

type RegisterRequest = {
	name: string
	email: string
	password: string
}

type AuthResponse = {
	token?: string
	message?: string
}

export type ApiError = {
	error: {
		code: string
		message: string
	}
}

// Login mutation
export function useLogin() {
	const queryClient = useQueryClient()

	return useMutation<AuthResponse, ApiError, LoginRequest>({
		mutationFn: async (credentials) => {
			const { data, error } = await client.POST("/auth/login", {
				body: credentials,
			})
			if (error) throw error
			return data as AuthResponse
		},
		onSuccess: (data) => {
			if (data.token) {
				localStorage.setItem(AUTH.TOKEN_KEY, data.token)
				// Invalidate any existing auth queries
				queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
			}
		},
	})
}

// Register mutation
export function useRegister() {
	return useMutation<AuthResponse, ApiError, RegisterRequest>({
		mutationFn: async (data) => {
			const { data: responseData, error } = await client.POST(
				"/auth/register",
				{
					body: data,
				},
			)
			if (error) throw error
			return responseData as AuthResponse
		},
	})
}

// Verify email mutation
export function useVerifyEmail() {
	return useMutation<AuthResponse, ApiError, { token: string }>({
		mutationFn: async ({ token }) => {
			const { data, error } = await client.POST("/auth/verify-email", {
				body: { token },
			})
			if (error) throw error
			return data as AuthResponse
		},
	})
}

// Hook that includes callbacks for verify email
export function useVerifyEmailWithCallbacks(
	onSuccess?: (data: AuthResponse) => void,
	onError?: (error: ApiError) => void,
) {
	return useMutation<AuthResponse, ApiError, { token: string }>({
		mutationFn: async ({ token }) => {
			const { data, error } = await client.POST("/auth/verify-email", {
				body: { token },
			})
			if (error) throw error
			return data as AuthResponse
		},
		onSuccess,
		onError,
	})
}

// Resend verification email mutation
export function useResendVerificationEmail() {
	return useMutation<AuthResponse, ApiError, { email: string }>({
		mutationFn: async ({ email }) => {
			const { data, error } = await client.POST("/auth/resend-verification", {
				body: { email },
			})
			if (error) throw error
			return data as AuthResponse
		},
	})
}

// Forgot password mutation
export function useForgotPassword() {
	return useMutation<AuthResponse, ApiError, { email: string }>({
		mutationFn: async ({ email }) => {
			const { data, error } = await client.POST("/auth/forgot-password", {
				body: { email },
			})
			if (error) throw error
			return data as AuthResponse
		},
	})
}

// Reset password mutation
export function useResetPassword() {
	return useMutation<
		AuthResponse,
		ApiError,
		{ token: string; password: string }
	>({
		mutationFn: async ({ token, password }) => {
			const { data, error } = await client.POST("/auth/reset-password", {
				body: { token, password },
			})
			if (error) throw error
			return data as AuthResponse
		},
	})
}

// Verify reset token query
export function useVerifyResetTokenQuery(token: string | undefined) {
	return useQuery<{ valid: boolean }, ApiError>({
		queryKey: ["auth", "verify-reset-token", token],
		queryFn: async () => {
			// Guard against undefined token (shouldn't happen due to enabled check, but satisfies type safety)
			if (!token) {
				throw {
					error: { code: "MISSING_TOKEN", message: "Token is required" },
				}
			}
			const { data, error } = await client.GET("/auth/verify-reset-token", {
				params: {
					query: { token },
				},
			})
			if (error) throw error
			return data as { valid: boolean }
		},
		enabled: !!token,
	})
}

// Admin login mutation
export function useAdminLogin() {
	const queryClient = useQueryClient()

	return useMutation<AuthResponse, ApiError, LoginRequest>({
		mutationFn: async (credentials) => {
			const { data, error } = await client.POST("/admin/auth/login", {
				body: credentials,
			})
			if (error) throw error
			return data as AuthResponse
		},
		onSuccess: (data) => {
			if (data.token) {
				localStorage.setItem(AUTH.ADMIN_TOKEN_KEY, data.token)
				queryClient.invalidateQueries({ queryKey: ["admin", "me"] })
			}
		},
	})
}

// Admin logout function
export function useAdminLogout() {
	const queryClient = useQueryClient()

	return () => {
		localStorage.removeItem(AUTH.ADMIN_TOKEN_KEY)
		queryClient.clear()
		window.location.href = AUTH.LOGIN_ROUTE
	}
}

// Unified logout - logs out from whichever session is active
export function useLogout() {
	const queryClient = useQueryClient()

	return () => {
		localStorage.removeItem(AUTH.TOKEN_KEY)
		localStorage.removeItem(AUTH.ADMIN_TOKEN_KEY)
		queryClient.clear()
		window.location.href = AUTH.LOGIN_ROUTE
	}
}

// Get current user (optional - for future use with /client/me)
export function useCurrentUser() {
	return useQuery({
		queryKey: ["auth", "me"],
		queryFn: async () => {
			const { data, error } = await client.GET("/client/me")
			if (error) throw error
			return data
		},
		enabled: !!localStorage.getItem(AUTH.TOKEN_KEY),
	})
}

// Unified login hook that tries client first, then admin
// Only exposes error after both attempts fail
export function useUnifiedLogin() {
	const queryClient = useQueryClient()
	// Use ref for synchronous tracking to avoid race conditions with react-query state
	const tryingAdminRef = useRef(false)
	const [isTryingAdmin, setIsTryingAdmin] = useState(false)
	// Tracks non-UNAUTHORIZED client errors (e.g. FORBIDDEN for suspended accounts)
	// that bypass the admin login fallback and need explicit state to trigger re-renders
	const [directClientError, setDirectClientError] = useState<ApiError | null>(
		null,
	)

	const clientLogin = useMutation<AuthResponse, ApiError, LoginRequest>({
		mutationFn: async (credentials) => {
			const { data, error } = await client.POST("/auth/login", {
				body: credentials,
			})
			if (error) throw error
			return data as AuthResponse
		},
		onSuccess: (data) => {
			if (data.token) {
				localStorage.setItem(AUTH.TOKEN_KEY, data.token)
				queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
			}
		},
	})

	const adminLogin = useMutation<AuthResponse, ApiError, LoginRequest>({
		mutationFn: async (credentials) => {
			const { data, error } = await client.POST("/admin/auth/login", {
				body: credentials,
			})
			if (error) throw error
			return data as AuthResponse
		},
		onSuccess: (data) => {
			if (data.token) {
				localStorage.setItem(AUTH.ADMIN_TOKEN_KEY, data.token)
				queryClient.invalidateQueries({ queryKey: ["admin", "me"] })
			}
		},
	})

	const mutate = useCallback(
		(
			credentials: LoginRequest,
			options?: {
				onSuccess?: (role: "client" | "admin") => void
				onError?: (error: ApiError) => void
			},
		) => {
			tryingAdminRef.current = false
			setIsTryingAdmin(false)
			setDirectClientError(null)
			clientLogin.reset()
			adminLogin.reset()

			clientLogin.mutate(credentials, {
				onSuccess: () => {
					options?.onSuccess?.("client")
				},
				onError: (clientError) => {
					// Try admin login on UNAUTHORIZED (client doesn't exist or wrong password)
					if (clientError?.error?.code === "UNAUTHORIZED") {
						// Set ref synchronously, then state for re-render
						tryingAdminRef.current = true
						setIsTryingAdmin(true)
						adminLogin.mutate(credentials, {
							onSuccess: () => {
								clientLogin.reset()
								tryingAdminRef.current = false
								setIsTryingAdmin(false)
								options?.onSuccess?.("admin")
							},
							onError: (adminError) => {
								tryingAdminRef.current = false
								setIsTryingAdmin(false)
								options?.onError?.(adminError)
							},
						})
					} else {
						setDirectClientError(clientError)
						options?.onError?.(clientError)
					}
				},
			})
		},
		[clientLogin, adminLogin],
	)

	const isPending =
		clientLogin.isPending || adminLogin.isPending || isTryingAdmin

	// Error is only shown when client failed and we're not trying/awaiting admin.
	// directClientError handles non-UNAUTHORIZED cases (e.g. suspended accounts)
	// that bypass admin login and need explicit state to guarantee a re-render.
	const error: ApiError | null =
		directClientError ||
		(clientLogin.error &&
		!tryingAdminRef.current &&
		!adminLogin.isPending &&
		!isTryingAdmin
			? adminLogin.error || clientLogin.error
			: null)

	const reset = useCallback(() => {
		tryingAdminRef.current = false
		setIsTryingAdmin(false)
		setDirectClientError(null)
		clientLogin.reset()
		adminLogin.reset()
	}, [clientLogin, adminLogin])

	return {
		mutate,
		isPending,
		error,
		reset,
		// Expose internal states for debugging if needed
		isClientPending: clientLogin.isPending,
		isAdminPending: adminLogin.isPending,
		isTryingAdmin,
	}
}

// Dismiss widget setup onboarding
export function useDismissWidgetSetup() {
	const queryClient = useQueryClient()

	return useMutation<{ message: string }, ApiError, void>({
		mutationFn: async () => {
			const { data, error } = await client.POST(
				"/client/me/dismiss-widget-setup",
			)
			if (error) throw error
			// Validate response shape - fail fast if data is invalid
			if (
				!data ||
				typeof data !== "object" ||
				Array.isArray(data) ||
				typeof (data as { message?: string }).message !== "string" ||
				((data as { message?: string }).message ?? "").trim().length === 0
			) {
				throw {
					error: {
						code: "INVALID_RESPONSE",
						message:
							"Invalid response: expected non-empty dismiss-widget-setup data object",
					},
				} satisfies ApiError
			}
			const responseData = data as { message: string }
			return { message: responseData.message }
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
		},
	})
}
