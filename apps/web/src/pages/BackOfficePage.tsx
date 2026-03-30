import { Link } from "@tanstack/react-router";
import { ArrowLeft, Moon, Shield, Sun } from "lucide-react";
import { BackOfficeStatCard, TenantsTable } from "@/components/backoffice";
import { Button } from "@/components/ui/button";
import { STATS, TENANTS } from "@/data/backoffice";
import { useTheme } from "@/lib/useTheme";

export function BackOfficePage() {
	const { theme, toggleTheme } = useTheme();

	return (
		<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
			<header className="flex h-16 items-center gap-4 border-zinc-200 border-b bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900">
				<Button variant="ghost" size="icon" asChild>
					<Link to="/dashboard">
						<ArrowLeft size={18} />
					</Link>
				</Button>
				<div className="flex flex-1 items-center gap-2">
					<Shield size={20} className="text-red-600 dark:text-red-500" />
					<h1 className="font-semibold text-zinc-900 dark:text-zinc-50">
						Platform Back-office
					</h1>
				</div>
				<button
					type="button"
					onClick={toggleTheme}
					className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
					aria-label={
						theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
					}
				>
					{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
				</button>
			</header>

			<main className="mx-auto max-w-7xl space-y-8 p-8">
				<div>
					<h2 className="font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-50">
						Platform Health
					</h2>
					<p className="text-zinc-500 dark:text-zinc-400">
						Aggregated stats and downstream service status.
					</p>
				</div>

				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					{STATS.map((stat) => (
						<BackOfficeStatCard key={stat.id} {...stat} />
					))}
				</div>

				<div>
					<h2 className="mb-4 font-bold text-xl text-zinc-900 tracking-tight dark:text-zinc-50">
						Clients / Tenants
					</h2>
					<TenantsTable tenants={TENANTS} />
				</div>
			</main>
		</div>
	);
}
