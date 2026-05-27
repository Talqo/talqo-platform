import type { AiProviderConfig } from "shared"
import { z } from "zod"

const normalizeEmpty = (val: string | undefined) =>
	val === undefined || val.trim() === "" ? undefined : val

const envSchema = z
	.object({
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
		RESEND_API_KEY: z.string().min(1),
		APP_URL: z.string().url(),
		ALLOWED_ORIGINS: z.string().optional(),
		// 32-byte AES-256-GCM key represented as 64 hex characters
		PROVIDER_KEY_SECRET: z
			.string()
			.length(64)
			.regex(/^[0-9a-fA-F]+$/)
			.refine(
				(val) => {
					// Allow trivially weak keys in test environment (e.g. all-zeros default)
					if (process.env.NODE_ENV === "test" || process.env.BUN_TEST === "1")
						return true
					const first = val[0]
					// Reject all-same-character keys (e.g. 000...0, aaa...a)
					return !val.split("").every((c) => c === first)
				},
				{
					message:
						"PROVIDER_KEY_SECRET must not be a trivially predictable value (all same character)",
				},
			),
		// Widget rate limiting — max messages per IP per hour
		WIDGET_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(60),
		// Max messages per conversation before the user must start a new one
		WIDGET_CONVERSATION_MAX_MESSAGES: z.coerce
			.number()
			.int()
			.positive()
			.default(50),
		// Default LLM provider — used when a client has not configured their own
		DEFAULT_LLM_PROVIDER_TYPE: z
			.enum(["openai", "openai_compatible", "google", "anthropic"])
			.optional(),
		DEFAULT_LLM_API_KEY: z.string().optional(),
		DEFAULT_LLM_MODEL: z.string().optional(),
		DEFAULT_LLM_BASE_URL: z.string().url().optional(),
		DEFAULT_EMBEDDING_MODEL: z.string().optional(),
		// Comma-separated list of trusted proxy IPs; when the direct connection is from one of these IPs, X-Forwarded-For is trusted
		TRUSTED_PROXY_IPS: z.string().optional(),
		SERVICE_NAME: z.string().optional(),
		SERVICE_VERSION: z.string().optional(),
		DEPLOYMENT_ID: z.string().optional(),
		REGION: z.string().optional(),
		SENTRY_DSN: z.string().url().optional(),
		SENTRY_ENVIRONMENT: z.string().default("development"),
	})
	.refine(
		(data) => {
			const hasAny =
				data.DEFAULT_LLM_PROVIDER_TYPE ??
				data.DEFAULT_LLM_API_KEY ??
				data.DEFAULT_LLM_MODEL
			if (hasAny) {
				return (
					!!data.DEFAULT_LLM_PROVIDER_TYPE &&
					!!data.DEFAULT_LLM_API_KEY &&
					!!data.DEFAULT_LLM_MODEL
				)
			}
			return true
		},
		{
			message:
				"DEFAULT_LLM_PROVIDER_TYPE, DEFAULT_LLM_API_KEY, and DEFAULT_LLM_MODEL must all be set when any one is provided",
		},
	)
	.refine(
		(data) => {
			if (data.DEFAULT_LLM_PROVIDER_TYPE === "openai_compatible") {
				return !!data.DEFAULT_LLM_BASE_URL
			}
			return true
		},
		{
			message:
				"DEFAULT_LLM_BASE_URL is required when DEFAULT_LLM_PROVIDER_TYPE is openai_compatible",
		},
	)

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
			RESEND_API_KEY: "test",
			APP_URL: "http://localhost:3000",
			ALLOWED_ORIGINS: "http://localhost:5173",
			// 64 hex chars = 32 bytes, valid for AES-256-GCM
			PROVIDER_KEY_SECRET:
				"0000000000000000000000000000000000000000000000000000000000000000",
			WIDGET_RATE_LIMIT_PER_HOUR: 60,
			WIDGET_CONVERSATION_MAX_MESSAGES: 50,
		}
	: {}

const parsed = envSchema.safeParse({
	...testDefaults,
	...process.env,
	ALLOWED_ORIGINS: normalizeEmpty(
		process.env.ALLOWED_ORIGINS ?? testDefaults.ALLOWED_ORIGINS,
	),
	DEFAULT_LLM_PROVIDER_TYPE: normalizeEmpty(
		process.env.DEFAULT_LLM_PROVIDER_TYPE,
	),
	DEFAULT_LLM_API_KEY: normalizeEmpty(process.env.DEFAULT_LLM_API_KEY),
	DEFAULT_LLM_MODEL: normalizeEmpty(process.env.DEFAULT_LLM_MODEL),
	DEFAULT_LLM_BASE_URL: normalizeEmpty(process.env.DEFAULT_LLM_BASE_URL),
	DEFAULT_EMBEDDING_MODEL: normalizeEmpty(process.env.DEFAULT_EMBEDDING_MODEL),
	TRUSTED_PROXY_IPS: normalizeEmpty(process.env.TRUSTED_PROXY_IPS),
	SENTRY_DSN: normalizeEmpty(process.env.SENTRY_DSN),
	SENTRY_ENVIRONMENT: normalizeEmpty(process.env.SENTRY_ENVIRONMENT),
})

if (!parsed.success) {
	// eslint-disable-next-line no-console
	console.error(
		"Invalid environment variables",
		parsed.error.flatten().fieldErrors,
	)
	process.exit(1)
}

const env = parsed.data

export const config = {
	...env,
	DATABASE_URL: `postgres://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`,
	isTest,
}

export function getDefaultProviderConfig(): AiProviderConfig | null {
	const {
		DEFAULT_LLM_PROVIDER_TYPE,
		DEFAULT_LLM_API_KEY,
		DEFAULT_LLM_MODEL,
		DEFAULT_LLM_BASE_URL,
		DEFAULT_EMBEDDING_MODEL,
	} = env
	if (!DEFAULT_LLM_PROVIDER_TYPE || !DEFAULT_LLM_API_KEY || !DEFAULT_LLM_MODEL)
		return null

	if (DEFAULT_LLM_PROVIDER_TYPE === "openai_compatible") {
		if (typeof DEFAULT_LLM_BASE_URL !== "string" || !DEFAULT_LLM_BASE_URL) {
			throw new Error(
				"DEFAULT_LLM_BASE_URL is required when DEFAULT_LLM_PROVIDER_TYPE is openai_compatible",
			)
		}
		return {
			providerType: DEFAULT_LLM_PROVIDER_TYPE,
			apiKey: DEFAULT_LLM_API_KEY,
			model: DEFAULT_LLM_MODEL,
			baseUrl: DEFAULT_LLM_BASE_URL,
			embeddingModel: DEFAULT_EMBEDDING_MODEL,
		}
	}
	const result: {
		providerType: string
		apiKey: string
		model: string
		baseUrl?: string
		embeddingModel?: string
	} = {
		providerType: DEFAULT_LLM_PROVIDER_TYPE,
		apiKey: DEFAULT_LLM_API_KEY,
		model: DEFAULT_LLM_MODEL,
	}
	if (typeof DEFAULT_LLM_BASE_URL === "string" && DEFAULT_LLM_BASE_URL) {
		result.baseUrl = DEFAULT_LLM_BASE_URL
	}
	if (DEFAULT_EMBEDDING_MODEL) {
		result.embeddingModel = DEFAULT_EMBEDDING_MODEL
	}
	return result as AiProviderConfig
}
