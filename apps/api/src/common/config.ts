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
})

const parsed = envSchema.safeParse(process.env)

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
