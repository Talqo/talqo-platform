import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { Widget } from "widget";
import { ErrorBoundary } from "@/components/error";

export const Route = createRootRoute({
	component: () => (
		<ErrorBoundary>
			<Outlet />
			<Widget />
			{import.meta.env.DEV && <TanStackRouterDevtools />}
		</ErrorBoundary>
	),
});
