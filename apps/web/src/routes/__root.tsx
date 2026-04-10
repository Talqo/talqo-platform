import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { createRootRoute, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/router-devtools"
import { ErrorBoundary } from "@/components/error"
import { StyledWidget } from "@/components/widget"
import { queryClient } from "@/lib/queryClient"

export const Route = createRootRoute({
	component: () => (
		<QueryClientProvider client={queryClient}>
			<ErrorBoundary>
				<Outlet />
				<StyledWidget />
				{import.meta.env.DEV && <TanStackRouterDevtools />}
				{import.meta.env.DEV && <ReactQueryDevtools />}
			</ErrorBoundary>
		</QueryClientProvider>
	),
})
