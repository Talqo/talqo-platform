import { Link, Outlet, useLocation } from "@tanstack/react-router"
import {
	Bot,
	Building2,
	Code,
	FileText,
	LayoutDashboard,
	LogOut,
	Moon,
	Settings,
	Sun,
	Wrench,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLogout } from "@/api/hooks/useAuth"
import { useClientProfile } from "@/api/hooks/useClientAccount"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher"
import { Skeleton } from "@/components/ui/skeleton"
import { useTheme } from "@/lib/useTheme"
import { cn } from "@/lib/utils"

export function DashboardLayout() {
	const location = useLocation()
	const logout = useLogout()
	const { theme, toggleTheme } = useTheme()
	const { data: profile, isLoading, isError, error } = useClientProfile()
	const { t } = useTranslation()

	const navItems = [
		{
			icon: LayoutDashboard,
			label: t("clientDashboard.nav.overview"),
			href: "/dashboard",
		},
		{
			icon: FileText,
			label: t("clientDashboard.nav.botContext"),
			href: "/dashboard/bot-context",
		},
		{
			icon: Bot,
			label: t("clientDashboard.nav.botConfiguration"),
			href: "/dashboard/bot-config",
		},
		{
			icon: Wrench,
			label: t("clientDashboard.nav.toolsMcp"),
			href: "/dashboard/tools",
		},
		{
			icon: Code,
			label: t("clientDashboard.nav.widgetSetup"),
			href: "/dashboard/widget-setup",
		},
		{
			icon: Settings,
			label: t("settings.account.title"),
			href: "/dashboard/settings",
		},
	]

	const handleLogout = () => {
		logout()
	}

	return (
		<div className="flex min-h-screen bg-background">
			{/* Sidebar */}
			<aside className="sticky top-0 flex h-screen w-64 flex-col overflow-y-auto border-border border-r bg-card">
				<Link
					to="/dashboard"
					className="flex h-16 items-center gap-2 border-border border-b px-6 transition-colors hover:bg-muted/50"
				>
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
						<Bot size={20} />
					</div>
					<span className="font-semibold text-card-foreground">
						{t("common.pagePal")}
					</span>
				</Link>
				<div className="flex flex-col gap-1 p-4">
					<div className="mb-2 px-2 font-semibold text-muted-foreground text-xs uppercase">
						{t("clientDashboard.nav.clientDashboard")}
					</div>
					{navItems.map((item) => {
						const isActive = location.pathname === item.href
						return (
							<Link
								key={item.href}
								to={item.href}
								className={cn(
									"flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-sm transition-colors",
									isActive
										? "bg-accent text-accent-foreground"
										: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
								)}
							>
								<item.icon size={18} />
								{item.label}
							</Link>
						)
					})}
				</div>

				<div className="mt-auto border-border border-t bg-card p-4">
					<Button
						variant="ghost"
						size="sm"
						onClick={toggleTheme}
						className="mb-2 w-full justify-start"
					>
						{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
						<span className="ml-2">
							{theme === "dark"
								? t("clientDashboard.nav.lightMode")
								: t("clientDashboard.nav.darkMode")}
						</span>
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleLogout}
						className="w-full justify-start text-destructive hover:text-destructive/80"
					>
						<LogOut size={18} />
						<span className="ml-2">{t("common.logOut")}</span>
					</Button>
				</div>
			</aside>

			{/* Main Content */}
			<div className="flex flex-1 flex-col">
				{/* Top Header with User Info */}
				<header className="flex h-16 items-center justify-end border-border border-b bg-card px-6">
					<div className="flex items-center gap-4">
						<LanguageSwitcher />
						<div className="flex items-center gap-2 text-sm">
							<Building2 size={16} className="text-muted-foreground" />
							{isLoading ? (
								<Skeleton className="h-4 w-32" />
							) : isError ? (
								<span
									className="text-destructive text-xs"
									title={error?.message}
								>
									{t("clientDashboard.nav.failedToLoad")}
								</span>
							) : (
								<span className="font-medium text-card-foreground">
									{profile?.name || t("clientDashboard.nav.unknownCompany")}
								</span>
							)}
						</div>
					</div>
				</header>
				<main className="flex-1 overflow-auto bg-background p-8">
					<Outlet />
				</main>
			</div>
		</div>
	)
}
