import createClient, { type Middleware } from "openapi-fetch"
import { AUTH } from "@/lib/constants"
import type { paths } from "./generated/openapi"

const authMiddleware: Middleware = {
	async onRequest({ request }) {
		// Check for client token first, then admin token
		const clientToken = localStorage.getItem(AUTH.TOKEN_KEY)
		const adminToken = localStorage.getItem(AUTH.ADMIN_TOKEN_KEY)
		const token = clientToken || adminToken
		if (token) {
			request.headers.set("Authorization", `Bearer ${token}`)
		}
		return request
	},
}

export const client = createClient<paths>({
	baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
})

client.use(authMiddleware)
