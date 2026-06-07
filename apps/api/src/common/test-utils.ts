import type { OpenAPIHono } from "@hono/zod-openapi"
import type { AppVariables } from "@/common/jwt"

const TEST_PASSWORD = "password123"
const TEST_APP_URL = "http://localhost:5173"
const TEST_RESEND_API_KEY = "test-api-key"

// Set default env vars at module evaluation time so they are present before
// any dynamic import caches `config` with stale values.
process.env.APP_URL ??= TEST_APP_URL
process.env.RESEND_API_KEY ??= TEST_RESEND_API_KEY
process.env.DEFAULT_LLM_PROVIDER_TYPE ??= "openai_compatible"
process.env.DEFAULT_LLM_API_KEY ??= "test-key"
process.env.DEFAULT_LLM_MODEL ??= "test-model"
process.env.DEFAULT_LLM_BASE_URL ??= "http://localhost:1234"

/**
 * Create a unique test email. Uses crypto.randomUUID() only — sufficient for
 * global uniqueness without the noise of Date.now().
 */
export function createUniqueEmail(prefix: string): string {
	return `${prefix}-${crypto.randomUUID()}@example.com`
}

/**
 * Raw SQL helper that manages connection lifecycle. Accepts a callback so
 * callers cannot forget to call `sql.end()`.
 */
export async function withSql<T>(
	fn: (sql: import("postgres").Sql) => Promise<T>,
): Promise<T> {
	const { config } = await import("@/common/config")
	const { default: postgres } = await import("postgres")
	const sql = postgres(config.DATABASE_URL)
	try {
		return await fn(sql)
	} finally {
		await sql.end()
	}
}

/**
 * Delete test emails from pending_registrations and clients tables.
 */
export async function cleanupEmails(emails: string[]): Promise<void> {
	if (emails.length === 0) return
	await withSql(async (sql) => {
		await sql`DELETE FROM pending_registrations WHERE email = ANY(${emails})`
		await sql`DELETE FROM clients WHERE email = ANY(${emails})`
	})
}

/**
 * Delete test emails from admin tables, pending_registrations, and clients.
 */
export async function cleanupAdminData(emails: string[]): Promise<void> {
	if (emails.length === 0) return
	await withSql(async (sql) => {
		await sql`DELETE FROM admin_access_logs WHERE admin_id IN (
			SELECT id FROM admin_users WHERE email = ANY(${emails})
		)`
		await sql`DELETE FROM admin_users WHERE email = ANY(${emails})`
		await sql`DELETE FROM pending_registrations WHERE email = ANY(${emails})`
		await sql`DELETE FROM clients WHERE email = ANY(${emails})`
	})
}

/**
 * Fetch the pending registration token for an email from the DB.
 */
export async function getVerificationToken(email: string): Promise<string> {
	return withSql(async (sql) => {
		const rows =
			await sql`SELECT token FROM pending_registrations WHERE email = ${email.toLowerCase()}`
		const token = rows[0]?.token
		if (!token) {
			throw new Error(
				`No verification token found for email: ${email.toLowerCase()}`,
			)
		}
		return token
	})
}

/**
 * Register a client via the API, verify their email, and return the client
 * row from the DB (includes id and widget_token).
 */
export async function registerClient(
	app: OpenAPIHono<{ Variables: AppVariables }>,
	email: string,
	name: string,
	password = TEST_PASSWORD,
): Promise<{ id: string; widget_token: string }> {
	const registerRes = await app.request("/v1/auth/register", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name, email, password }),
	})
	if (registerRes.status !== 201) {
		throw new Error(
			`registerClient failed: ${registerRes.status} ${await registerRes.text()}`,
		)
	}

	const token = await getVerificationToken(email)
	const verifyRes = await app.request("/v1/auth/verify-email", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ token }),
	})
	if (verifyRes.status !== 200) {
		throw new Error(
			`verifyEmail failed: ${verifyRes.status} ${await verifyRes.text()}`,
		)
	}

	return withSql(async (sql) => {
		const rows =
			await sql`SELECT id, widget_token FROM clients WHERE email = ${email.toLowerCase()}`
		const client = rows[0]
		if (!client) {
			throw new Error(`Client not found after verification: ${email}`)
		}
		return client as { id: string; widget_token: string }
	})
}

/**
 * Create an admin via the API (uses the actual admin registration flow if one
 * exists, otherwise falls back to raw SQL for test bootstrap).
 */
export async function createAdminUser(
	app: OpenAPIHono<{ Variables: AppVariables }>,
	email: string,
	password = TEST_PASSWORD,
): Promise<{ token: string }> {
	const passwordHash = await Bun.password.hash(password)

	await withSql(async (sql) => {
		await sql`INSERT INTO admin_users (email, password_hash) VALUES (${email}, ${passwordHash})`
	})

	const loginRes = await app.request("/v1/admin/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	})
	if (loginRes.status !== 200) {
		throw new Error(
			`Admin login failed: ${loginRes.status} ${await loginRes.text()}`,
		)
	}
	const body = (await loginRes.json()) as { token: string }
	return body
}

/**
 * Add funds to a client's balance (raw SQL, bypasses payment flow).
 */
export async function addFundsToClient(
	clientId: string,
	amount: number,
): Promise<void> {
	return withSql(async (sql) => {
		await sql`UPDATE clients SET balance_usd = balance_usd + ${amount} WHERE id = ${clientId}`
	})
}

/**
 * Register, verify, and log in a client; return the JWT token.
 */
export async function registerAndVerify(
	app: OpenAPIHono<{ Variables: AppVariables }>,
	email: string,
	name: string,
	password = TEST_PASSWORD,
): Promise<string> {
	await registerClient(app, email, name, password)

	const loginRes = await app.request("/v1/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	})
	if (loginRes.status !== 200) {
		throw new Error(`login failed: ${loginRes.status} ${await loginRes.text()}`)
	}
	const body = (await loginRes.json()) as { token: string }
	return body.token
}
