import { z } from "zod";

export const createSessionBodySchema = z.object({
	browserSessionId: z.string().min(1),
});

export const rateConversationBodySchema = z.object({
	rating: z.number().int().min(1).max(5),
});

export const sendMessageBodySchema = z.object({
	content: z.string().min(1),
});
