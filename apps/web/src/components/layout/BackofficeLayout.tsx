import { Link, Outlet, useLocation } from "@tanstack/react-router"
import {
	Building2,
	LogOut,
	MessageSquare,
	Moon,
	ScrollText,
	Sun,
} from "lucide-react"
import { useAdminProfile } from "@/api/hooks/useAdmin"
import { useAdminLogout } from "@/api/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher"
import { Skeleton } from "@/components/ui/skeleton"
import { useTheme } from "@/lib/useTheme"
import { cn } from "@/lib/utils"

type BackofficeLayoutProps = {
	children?: React.ReactNode
}

export function BackofficeLayout({ children }: BackofficeLayoutProps) {
	const location = useLocation()
	const logout = useAdminLogout()
	const { theme, toggleTheme } = useTheme()
	const { data: adminProfile, isLoading, isError, error } = useAdminProfile()

	const navItems = [
		{ icon: Building2, label: "Tenants", href: "/backoffice" },
		{ icon: MessageSquare, label: "Chats", href: "/backoffice/chats" },
		{ icon: ScrollText, label: "Activity Logs", href: "/backoffice/logs" },
	]

	const handleLogout = () => {
		logout()
	}

	return (
		<div className="flex min-h-screen bg-background">
			{/* Sidebar */}
			<aside className="sticky top-0 flex h-screen w-64 flex-col overflow-y-auto border-border border-r bg-card">
				<Link
					to="/backoffice"
					className="flex h-16 items-center gap-2 border-border border-b px-6 transition-colors hover:bg-muted/50"
				>
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
						<Building2 size={20} />
					</div>
					<span className="font-semibold text-card-foreground">
						PagePal Admin
					</span>
				</Link>
				<div className="flex flex-col gap-1 p-4">
					<div className="mb-2 px-2 font-semibold text-muted-foreground text-xs uppercase">
						Admin Dashboard
					</div>
					{navItems.map((item) => {
						const isActive =
							location.pathname === item.href ||
							location.pathname.startsWith(`${item.href}/`)
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
							{theme === "dark" ? "Light Mode" : "Dark Mode"}
						</span>
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleLogout}
						className="w-full justify-start text-destructive hover:text-destructive/80"
					>
						<LogOut size={18} />
						<span className="ml-2">Log out</span>
					</Button>
				</div>
			</aside>

			{/* Main Content */}
			<div className="flex flex-1 flex-col">
				{/* Top Header with Admin Info */}
				<header className="flex h-16 items-center justify-end border-border border-b bg-card px-6">
					<div className="flex items-center gap-4">
						<LanguageSwitcher />
						<div className="flex items-center gap-2 text-sm">
							{isLoading ? (
								<Skeleton className="h-4 w-32" />
							) : isError ? (
								<span
									className="text-destructive text-xs"
									title={error?.message}
								>
									Failed to load
								</span>
							) : (
								<span className="font-medium text-card-foreground">
									{adminProfile?.email || "Admin"}
								</span>
							)}
						</div>
					</div>
				</header>
				<main className="flex-1 overflow-auto bg-background p-8">
					{children ?? <Outlet />}
				</main>
			</div>
		</div>
	)
}
