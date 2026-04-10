import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useRef, useState } from "react"
import { AUTH } from "@/lib/constants"
import { client } from "../client"

// Types from OpenAPI spec
interface LoginRequest {
	email: string
	password: string
}

interface RegisterRequest {
	name: string
	email: string
	password: string
}

interface AuthResponse {
	success: boolean
	data: {
		token?: string
		message?: string
	}
}

interface ApiError {
	success: false
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
			if (data.data.token) {
				localStorage.setItem(AUTH.TOKEN_KEY, data.data.token)
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
			const { data, error } = await client.GET("/auth/verify-email", {
				params: {
					query: { token },
				},
			})
			if (error) throw error
			return data as AuthResponse
		},
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
			if (data.data.token) {
				localStorage.setItem(AUTH.ADMIN_TOKEN_KEY, data.data.token)
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

	const clientLogin = useMutation<AuthResponse, ApiError, LoginRequest>({
		mutationFn: async (credentials) => {
			const { data, error } = await client.POST("/auth/login", {
				body: credentials,
			})
			if (error) throw error
			return data as AuthResponse
		},
		onSuccess: (data) => {
			if (data.data.token) {
				localStorage.setItem(AUTH.TOKEN_KEY, data.data.token)
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
			if (data.data.token) {
				localStorage.setItem(AUTH.ADMIN_TOKEN_KEY, data.data.token)
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
			clientLogin.reset()
			adminLogin.reset()

			clientLogin.mutate(credentials, {
				onSuccess: () => {
					options?.onSuccess?.("client")
				},
				onError: (clientError) => {
					if (clientError?.error?.code === "INVALID_CREDENTIALS") {
						// Set ref synchronously, then state for re-render
						tryingAdminRef.current = true
						setIsTryingAdmin(true)
						adminLogin.mutate(credentials, {
							onSuccess: () => {
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
						options?.onError?.(clientError)
					}
				},
			})
		},
		[clientLogin, adminLogin],
	)

	const isPending =
		clientLogin.isPending || adminLogin.isPending || isTryingAdmin

	// Error is only shown when client failed and we're not trying/awaiting admin
	// Use the ref for immediate synchronous check to prevent flash
	const error: ApiError | null =
		clientLogin.error &&
		!tryingAdminRef.current &&
		!adminLogin.isPending &&
		!isTryingAdmin
			? adminLogin.error || clientLogin.error
			: null

	const reset = useCallback(() => {
		tryingAdminRef.current = false
		setIsTryingAdmin(false)
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
