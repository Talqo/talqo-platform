import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
	component: LandingPage,
});

function LandingPage() {
	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground">
			<header className="flex items-center justify-between px-6 py-4">
				<div className="font-bold text-foreground text-xl">Talqo</div>
				<nav className="flex items-center gap-4">
					<Link
						to="/dashboard"
						className="font-medium text-muted-foreground text-sm hover:text-foreground"
					>
						Dashboard
					</Link>
				</nav>
			</header>

			<main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
				<h1 className="max-w-3xl font-bold text-4xl text-foreground tracking-tight sm:text-5xl md:text-6xl">
					Chat widgets that feel like part of your product
				</h1>
				<p className="mt-6 max-w-xl text-lg text-muted-foreground">
					Talqo helps you build, deploy, and monitor AI-powered chat bots with a
					widget you can drop into any site.
				</p>
				<div className="mt-10">
					<Button
						asChild
						size="lg"
						className="rounded-(--radius-pill) px-8 py-6 text-lg"
					>
						<Link to="/dashboard">Get Started</Link>
					</Button>
				</div>
			</main>

			<footer className="px-6 py-6 text-center text-muted-foreground text-sm">
				© {new Date().getFullYear()} Talqo. All rights reserved.
			</footer>
		</div>
	);
}
