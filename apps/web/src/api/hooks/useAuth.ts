import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { STORAGE_KEYS } from "@/lib/constants"
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
				localStorage.setItem(STORAGE_KEYS.TOKEN, data.data.token)
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

// Logout function (not a mutation, just clears storage)
export function useLogout() {
	const queryClient = useQueryClient()

	return () => {
		localStorage.removeItem(STORAGE_KEYS.TOKEN)
		queryClient.clear()
		window.location.href = "/login"
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
		enabled: !!localStorage.getItem(STORAGE_KEYS.TOKEN),
	})
}
