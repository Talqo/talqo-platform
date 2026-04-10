import type { LoginInput, RegisterInput, VerifyEmailInput } from "shared"

// Auth routes use plain Hono (not OpenAPIHono) so they are absent from the
// generated spec. This file provides manually-typed wrappers for those 3 endpoints.

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

async function post<T>(path: string, body: unknown): Promise<T> {
	const res = await fetch(`${baseUrl}${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	})
	const json = await res.json()
	if (!res.ok) throw json
	return json as T
}

export type RegisterResponse = { success: true; message: string }
export type LoginResponse = {
	success: true
	message: string
	data: { token: string }
}
export type VerifyEmailResponse = { success: true; message: string }

export const authClient = {
	register: (body: RegisterInput) =>
		post<RegisterResponse>("/auth/register", body),

	login: (body: LoginInput) => post<LoginResponse>("/auth/login", body),

	verifyEmail: (body: VerifyEmailInput) => {
		const params = new URLSearchParams({ token: body.token })
		return fetch(`${baseUrl}/auth/verify-email?${params}`).then(async (res) => {
			const json = await res.json()
			if (!res.ok) throw json
			return json as VerifyEmailResponse
		})
	},
}
