import { OpenAPIHono } from "@hono/zod-openapi"
import type { Env } from "hono"

export function createRouter<E extends Env = Env>() {
	return new OpenAPIHono<E>({
		// Only intercept form/multipart validation — @hono/zod-openapi 1.3.0 added
		// automatic form validation, but its default hook returns 400. Other
		// targets (query, json, param) keep the library default of 400.
		defaultHook: (result, c) => {
			if (result.success || result.target !== "form") return
			return c.json(
				{
					error: {
						code: "VALIDATION_ERROR",
						message: result.error.issues
							.map((i: { message: string }) => i.message)
							.join(", "),
					},
				},
				422,
			)
		},
	})
}
