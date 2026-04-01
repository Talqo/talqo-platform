import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { Widget } from "widget";
import { ErrorBoundary } from "@/components/error";
import { queryClient } from "@/lib/queryClient";

export const Route = createRootRoute({
	component: () => (
		<QueryClientProvider client={queryClient}>
			<ErrorBoundary>
				<Outlet />
				<Widget />
				{import.meta.env.DEV && <TanStackRouterDevtools />}
				{import.meta.env.DEV && <ReactQueryDevtools />}
			</ErrorBoundary>
		</QueryClientProvider>
	),
});
