import { defineConfig } from "drizzle-kit"

const {
	POSTGRES_USER,
	POSTGRES_PASSWORD,
	POSTGRES_HOST = "localhost",
	POSTGRES_PORT = "5432",
	POSTGRES_DB,
} = process.env

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/schema/index.ts",
	out: "./drizzle",
	dbCredentials: {
		url: `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`,
	},
	verbose: true,
	strict: true,
})
