import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { client } from "@/api/client"
import type { paths } from "@/api/generated/openapi"
import { getApiBaseUrl } from "@/lib/api"
import { AUTH } from "@/lib/constants"

const FILES_KEY = ["files"] as const

type FileListResponse =
	paths["/client/me/files"]["get"]["responses"][200]["content"]["application/json"]
export type FileEntry = FileListResponse["entries"][number]

export function useFiles() {
	return useQuery({
		queryKey: FILES_KEY,
		queryFn: async () => {
			const { data, error } = await client.GET("/client/me/files", {
				params: { query: { path: "/" } },
			})
			if (error) throw error
			return data.entries.filter(
				(e): e is FileEntry & { type: "file" } => e.type === "file",
			)
		},
	})
}

export function useUploadFile() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (file: File) => {
			// openapi-fetch forces Content-Type: application/json on POST, which breaks
			// multipart parsing on the backend. Raw fetch lets the browser set the
			// correct Content-Type: multipart/form-data; boundary=... automatically.
			const token = localStorage.getItem(AUTH.TOKEN_KEY)
			const fd = new FormData()
			fd.append("file", file)
			const res = await fetch(
				`${getApiBaseUrl()}/client/me/files?path=/&index=false`,
				{
					method: "POST",
					headers: token ? { Authorization: `Bearer ${token}` } : {},
					body: fd,
				},
			)
			if (!res.ok) throw await res.json()
			return res.json()
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: FILES_KEY }),
	})
}

export function useDeleteFile() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (path: string) => {
			const { data, error } = await client.DELETE("/client/me/files", {
				params: { query: { path } },
			})
			if (error) throw error
			return data
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: FILES_KEY }),
	})
}

export function useRenameFile() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async ({ from, to }: { from: string; to: string }) => {
			const { data, error } = await client.POST("/client/me/files/move", {
				body: { from, to },
			})
			if (error) throw error
			return data
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: FILES_KEY }),
	})
}

export function useReindexFile() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (path: string) => {
			const { data, error } = await client.POST("/client/me/files/reindex", {
				body: { path },
			})
			if (error) throw error
			return data
		},
		onSettled: () => qc.invalidateQueries({ queryKey: FILES_KEY }),
	})
}
