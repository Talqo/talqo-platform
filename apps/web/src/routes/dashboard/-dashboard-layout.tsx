import { Link, useRouterState } from "@tanstack/react-router";
import {
	BarChart3,
	Bot,
	LayoutDashboard,
	Menu,
	MessageSquare,
	User,
	X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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

export function DashboardLayout({ children }: { children: React.ReactNode }) {
	const [mobileOpen, setMobileOpen] = useState(false);
	const { location } = useRouterState();
	const currentPath = location.pathname;
	const closeMobile = () => setMobileOpen(false);

	return (
		<div className="flex min-h-screen bg-background text-foreground">
			{/* Desktop sidebar */}
			<aside className="hidden w-64 flex-col border-sidebar-border border-r bg-sidebar p-4 md:flex">
				<div className="mb-6 px-3 font-bold text-sidebar-foreground text-xl">
					Talqo
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
			</aside>

			<div className="flex min-h-screen flex-1 flex-col">
				{/* Mobile header */}
				<header className="flex items-center justify-between border-border border-b bg-sidebar p-4 md:hidden">
					<div className="font-bold text-sidebar-foreground text-xl">Talqo</div>
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
					</nav>
				)}

				<main className="flex-1 p-6">{children}</main>
			</div>
		</div>
	);
}
