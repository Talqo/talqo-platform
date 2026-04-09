import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AUTH, STORAGE_KEYS } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated")({
	component: AuthenticatedLayout,
});

// Validate token by making a lightweight request
async function validateToken(token: string): Promise<boolean> {
	try {
		// Use the /client/me endpoint which requires auth
		const response = await fetch(
			`${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/client/me`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);
		return response.ok;
	} catch {
		return false;
	}
}

function AuthenticatedLayout() {
	const [isLoading, setIsLoading] = useState(true);
	const [isValid, setIsValid] = useState(false);

	useEffect(() => {
		const checkAuth = async () => {
			const token = localStorage.getItem(STORAGE_KEYS.TOKEN);

			if (!token) {
				setIsValid(false);
				setIsLoading(false);
				return;
			}

			const valid = await validateToken(token);
			if (!valid) {
				// Token is invalid, clear it
				localStorage.removeItem(STORAGE_KEYS.TOKEN);
			}
			setIsValid(valid);
			setIsLoading(false);
		};

		checkAuth();
	}, []);

	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (!isValid) {
		return <Navigate to={AUTH.LOGIN_ROUTE} replace />;
	}

	return <Outlet />;
}
