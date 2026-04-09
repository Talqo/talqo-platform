import { z } from "zod";

export const mcpConfigBodySchema = z.object({
	mcpConfig: z.unknown(),
});
