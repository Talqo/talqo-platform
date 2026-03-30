import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.string().min(1),
	JWT_SECRET: z.string().min(32),
	JWT_EXPIRES_IN: z.string().default("24h"),
	API_PORT: z.coerce.number().default(3000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error(
		"Invalid environment variables:",
		parsed.error.flatten().fieldErrors,
	);
	process.exit(1);
}

export const config = parsed.data;
