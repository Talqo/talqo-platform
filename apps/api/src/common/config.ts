import { z } from "zod"

const envSchema = z.object({
	POSTGRES_USER: z.string().min(1),
	POSTGRES_PASSWORD: z.string().min(1),
	POSTGRES_HOST: z.string().default("localhost"),
	POSTGRES_PORT: z.coerce.number().default(5432),
	POSTGRES_DB: z.string().min(1),
	JWT_SECRET: z.string().min(32),
	JWT_EXPIRES_IN: z.string().default("24h"),
	API_PORT: z.coerce.number().default(3000),
	S3_ACCESS_KEY_ID: z.string().min(1),
	S3_SECRET_ACCESS_KEY: z.string().min(1),
	S3_ENDPOINT: z.string().url(),
	S3_BUCKET: z.string().min(1),
	RESEND_API_KEY: z.string().min(1).optional(),
	APP_URL: z.string().url().optional(),
})

// For tests, provide default values so config validation doesn't fail
// These defaults are only used in test environment
const isTest = process.env.NODE_ENV === "test" || process.env.BUN_TEST === "1"

const testDefaults = isTest
	? {
			POSTGRES_USER: "test",
			POSTGRES_PASSWORD: "test",
			POSTGRES_DB: "test",
			JWT_SECRET: "test-secret-that-is-at-least-32-characters-long",
			S3_ACCESS_KEY_ID: "test",
			S3_SECRET_ACCESS_KEY: "test",
			S3_ENDPOINT: "http://localhost:9000",
			S3_BUCKET: "test",
		}
	: {}

const parsed = envSchema.safeParse({ ...testDefaults, ...process.env })

if (!parsed.success) {
	console.error(
		"Invalid environment variables:",
		parsed.error.flatten().fieldErrors,
	)
	process.exit(1)
}

const env = parsed.data

export const config = {
	...env,
	DATABASE_URL: `postgres://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`,
}
