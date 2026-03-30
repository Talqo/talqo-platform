import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
	Bot,
	LayoutDashboard,
	LogOut,
	Moon,
	Settings,
	Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/useTheme";
import { cn } from "@/lib/utils";

export function DashboardLayout() {
	const location = useLocation();
	const navigate = useNavigate();
	const { theme, toggleTheme } = useTheme();

	const navItems = [
		{ icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
		{ icon: Settings, label: "Settings", href: "/dashboard/settings" },
	];

	const handleLogout = () => {
		navigate({ to: "/" });
	};

	return (
		<div className="flex min-h-screen bg-background">
			{/* Sidebar */}
			<aside className="relative flex w-64 flex-col border-border border-r bg-card">
				<div className="flex h-16 items-center gap-2 border-border border-b px-6">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
						<Bot size={20} />
					</div>
					<span className="font-semibold text-card-foreground">PagePal</span>
				</div>
				<div className="flex flex-col gap-1 p-4">
					<div className="mb-2 px-2 font-semibold text-muted-foreground text-xs uppercase">
						Client Dashboard
					</div>
					{navItems.map((item) => {
						const isActive = location.pathname === item.href;
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
						);
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
			<main className="flex-1 overflow-auto bg-background p-8">
				<Outlet />
			</main>
		</div>
	);
}
