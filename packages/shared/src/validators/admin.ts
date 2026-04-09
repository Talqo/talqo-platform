import { z } from "zod";

export const clientStatusUpdateSchema = z.object({
	status: z.enum(["active", "suspended"]),
});
