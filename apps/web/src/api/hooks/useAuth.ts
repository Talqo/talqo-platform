import { useMutation } from "@tanstack/react-query";
import type { LoginInput, RegisterInput, VerifyEmailInput } from "shared";
import { authClient } from "../auth.client";

export function useRegister() {
	return useMutation({
		mutationFn: (body: RegisterInput) => authClient.register(body),
	});
}

export function useLogin() {
	return useMutation({
		mutationFn: (body: LoginInput) => authClient.login(body),
		onSuccess: ({ data }) => {
			localStorage.setItem("token", data.token);
		},
	});
}

export function useVerifyEmail() {
	return useMutation({
		mutationFn: (body: VerifyEmailInput) => authClient.verifyEmail(body),
	});
}

export function useLogout() {
	return useMutation({
		mutationFn: async () => {
			localStorage.removeItem("token");
		},
	});
}
