import createClient, { type Middleware } from "openapi-fetch"
import { getApiBaseUrl } from "@/lib/api"
import { AUTH } from "@/lib/constants"
import type { paths } from "./generated/openapi"

const authMiddleware: Middleware = {
	async onRequest({ request }) {
		const clientToken = localStorage.getItem(AUTH.TOKEN_KEY)
		const adminToken = localStorage.getItem(AUTH.ADMIN_TOKEN_KEY)
		const isAdminRequest = request.url.includes("/admin")
		const token = isAdminRequest ? adminToken : clientToken || adminToken
		if (token) {
			request.headers.set("Authorization", `Bearer ${token}`)
		}
		return request
	},
}

export const client = createClient<paths>({
	baseUrl: getApiBaseUrl(),
})

client.use(authMiddleware)
