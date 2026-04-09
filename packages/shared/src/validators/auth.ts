import { z } from "zod";

export const RegisterSchema = z.object({
	name: z.string().trim().min(1).max(100),
	email: z.string().trim().email(),
	password: z.string().min(8).max(100),
});

export const LoginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

export const VerifyEmailSchema = z.object({
	token: z.string().uuid(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
