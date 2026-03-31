import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { ErrorBoundary } from "@/components/error";
import { StyledWidget } from "@/components/widget";

export const Route = createRootRoute({
	component: () => (
		<ErrorBoundary>
			<Outlet />
			<StyledWidget />
			{import.meta.env.DEV && <TanStackRouterDevtools />}
		</ErrorBoundary>
	),
});
