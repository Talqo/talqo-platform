import { Link } from "@tanstack/react-router";
import { Bot, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/use-theme";

export function LandingHeader() {
	const { theme, toggleTheme } = useTheme();

	return (
		<header className="sticky top-0 z-50 border-border border-b bg-background/90 px-4 text-foreground shadow-sm backdrop-blur-xl sm:px-6">
			<div className="mx-auto flex h-16 max-w-7xl items-center">
				<Link to="/" className="flex flex-1 items-center gap-2">
					<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
						<Bot size={20} />
					</div>
					<span className="font-black text-lg tracking-tight">Talqo</span>
				</Link>
				<nav className="flex items-center gap-2 sm:gap-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={toggleTheme}
						aria-label={
							theme === "dark"
								? "Switch to light theme"
								: "Switch to dark theme"
						}
					>
						{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
					</Button>
					<Button className="rounded-full px-4 font-bold sm:px-5" asChild>
						<Link to="/dashboard">Get Started</Link>
					</Button>
				</nav>
			</div>
		</header>
	);
}
