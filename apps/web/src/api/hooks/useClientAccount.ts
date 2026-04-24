import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { client } from "../client"
import type { ApiError } from "./useAuth"

export function useClientProfile() {
	return useQuery({
		queryKey: ["client", "profile"],
		queryFn: async () => {
			const { data, error } = await client.GET("/client/me")
			if (error) throw error
			return data
		},
	})
}

export function useUpdateClientProfile() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (body: { name?: string; email?: string }) => {
			const { data, error } = await client.PATCH("/client/me", { body })
			if (error) throw error
			return data
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["client", "profile"] }),
	})
}

export function useChangePassword() {
	return useMutation<
		{ message: string },
		ApiError,
		{ currentPassword: string; newPassword: string }
	>({
		mutationFn: async (body) => {
			const { data, error } = await client.PATCH("/client/me/password", {
				body,
			})
			if (error) throw error
			return data
		},
	})
}

export function useAddFunds() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (body: { amount: number }) => {
			const { data, error } = await client.POST("/client/me/balance", { body })
			if (error) throw error
			return data
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["client", "profile"] }),
	})
}

export function useSetUsageLimit() {
	return useMutation({
		mutationFn: async (body: { limit: number | null }) => {
			const { data, error } = await client.PATCH("/client/me/usage-limit", {
				body,
			})
			if (error) throw error
			return data
		},
	})
}

export function useSetUsageAlert() {
	return useMutation({
		mutationFn: async (body: { thresholdUsd: number | null }) => {
			const { data, error } = await client.PATCH("/client/me/usage-alert", {
				body,
			})
			if (error) throw error
			return data
		},
	})
}
