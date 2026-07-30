import { Link, useRouterState } from "@tanstack/react-router";
import {
	BarChart3,
	Bot,
	LayoutDashboard,
	Menu,
	MessageSquare,
	Moon,
	Sun,
	User,
	X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/use-theme";

const navItems = [
	{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ to: "/dashboard/bots", label: "Bots", icon: Bot },
	{ to: "/dashboard/widget", label: "Widget", icon: MessageSquare },
	{ to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
	{ to: "/dashboard/account", label: "Account", icon: User },
];

function NavLink({
	to,
	label,
	icon: Icon,
	currentPath,
	onNavigate,
}: (typeof navItems)[number] & {
	currentPath: string;
	onNavigate: () => void;
}) {
	// The index "/dashboard" entry must only be active on the exact path,
	// otherwise every sub-page would highlight "Dashboard" as well.
	const active =
		to === "/dashboard"
			? currentPath === to
			: currentPath === to || currentPath.startsWith(`${to}/`);
	return (
		<Link
			to={to}
			aria-current={active ? "page" : undefined}
			className={`flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-sm transition-colors ${
				active
					? "bg-sidebar-primary text-sidebar-primary-foreground"
					: "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
			}`}
			onClick={onNavigate}
		>
			<Icon className="size-5" />
			{label}
		</Link>
	);
}

function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();
	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggleTheme}
			aria-label={
				theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
			}
		>
			{theme === "dark" ? (
				<Sun className="size-5" />
			) : (
				<Moon className="size-5" />
			)}
		</Button>
	);
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
	const [mobileOpen, setMobileOpen] = useState(false);
	const { location } = useRouterState();
	const currentPath = location.pathname;
	const closeMobile = () => setMobileOpen(false);

	return (
		<div className="flex min-h-screen bg-background text-foreground">
			{/* Desktop sidebar */}
			<aside className="sticky top-0 hidden h-dvh w-64 flex-col overflow-y-auto border-sidebar-border border-r bg-sidebar p-4 md:flex">
				<div className="mb-6 truncate px-3 font-semibold text-muted-foreground text-sm">
					Account name
				</div>
				<nav className="flex flex-1 flex-col gap-1">
					{navItems.map((item) => (
						<NavLink
							key={item.to}
							{...item}
							currentPath={currentPath}
							onNavigate={closeMobile}
						/>
					))}
				</nav>
				<div className="mt-4 flex items-center justify-between border-sidebar-border border-t pt-3">
					<span className="px-3 text-muted-foreground text-xs">Theme</span>
					<ThemeToggle />
				</div>
			</aside>

			<div className="flex min-h-screen flex-1 flex-col">
				{/* Mobile header */}
				<header className="sticky top-0 z-20 flex items-center justify-between border-border border-b bg-sidebar p-4 md:hidden">
					<div className="truncate font-semibold text-muted-foreground text-sm">
						Account name
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setMobileOpen((open) => !open)}
						aria-label="Toggle navigation"
					>
						{mobileOpen ? (
							<X className="size-5" />
						) : (
							<Menu className="size-5" />
						)}
					</Button>
				</header>
				{mobileOpen && (
					<nav className="flex flex-col gap-1 border-border border-b bg-sidebar p-4 md:hidden">
						{navItems.map((item) => (
							<NavLink
								key={item.to}
								{...item}
								currentPath={currentPath}
								onNavigate={closeMobile}
							/>
						))}
						<div className="mt-2 flex items-center justify-between border-sidebar-border border-t pt-3">
							<span className="px-3 text-muted-foreground text-xs">Theme</span>
							<ThemeToggle />
						</div>
					</nav>
				)}

				<main className="flex-1 p-6">{children}</main>
			</div>
		</div>
	);
}
