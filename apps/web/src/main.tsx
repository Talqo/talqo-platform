import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { applyTheme, getInitialTheme } from "./lib/use-theme";
import { routeTree } from "./routeTree.gen";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Root element not found");
}

// Apply the persisted/system theme before first paint to avoid a theme flash.
applyTheme(getInitialTheme());

document.documentElement.dataset.font = "inter";
document.documentElement.dataset.radius = "pill";

const queryClient = new QueryClient();

const router = createRouter({
	routeTree,
	context: { queryClient },
	defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

createRoot(rootElement).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	</StrictMode>,
);
