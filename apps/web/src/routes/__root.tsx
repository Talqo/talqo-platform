import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { createRootRoute, Link, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { FileQuestion, Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"
import { ErrorBoundary } from "@/components/error"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { queryClient } from "@/lib/queryClient"
import { useTheme } from "@/lib/useTheme"

function NotFoundPage() {
	const { t } = useTranslation()
	const { theme, toggleTheme } = useTheme()

	return (
		<div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
			<Button
				variant="ghost"
				size="icon"
				onClick={toggleTheme}
				className="absolute top-4 right-4"
				aria-label={
					theme === "dark"
						? t("common.switchToLightMode")
						: t("common.switchToDarkMode")
				}
			>
				{theme === "dark" ? (
					<Sun className="h-5 w-5" />
				) : (
					<Moon className="h-5 w-5" />
				)}
			</Button>

			<Card className="w-full max-w-md text-center">
				<CardHeader className="pb-2">
					<div className="mb-4 flex flex-col items-center gap-3">
						<div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
							<FileQuestion className="h-10 w-10 text-primary" />
						</div>
						<span className="font-mono text-sm font-semibold tracking-widest text-muted-foreground uppercase">
							Error 404
						</span>
					</div>
					<CardTitle className="text-2xl">{t("notFound.title")}</CardTitle>
					<CardDescription className="text-base">
						{t("notFound.description")}
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-3 pt-2">
					<Button asChild>
						<Link to="/dashboard">{t("notFound.goDashboard")}</Link>
					</Button>
					<Button asChild variant="outline">
						<Link to="/">{t("notFound.goHome")}</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}

export const Route = createRootRoute({
	notFoundComponent: NotFoundPage,
	component: () => (
		<QueryClientProvider client={queryClient}>
			<ErrorBoundary>
				<Outlet />
				{/* Widget loaded via embed script in index.html */}
				{import.meta.env.DEV && <TanStackRouterDevtools />}
				{import.meta.env.DEV && <ReactQueryDevtools />}
			</ErrorBoundary>
		</QueryClientProvider>
	),
})
