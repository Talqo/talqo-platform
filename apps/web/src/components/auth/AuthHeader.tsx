import { Link } from "@tanstack/react-router";
import { Bot, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/useTheme";

export function AuthHeader() {
	const { theme, toggleTheme } = useTheme();

	return (
		<div className="mb-8 flex flex-col items-center">
			<div className="mb-6 flex w-full items-center justify-between rounded-lg border-2 border-primary/30 p-4">
				<Link to="/" className="flex items-center gap-2">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-primary bg-primary text-primary-foreground">
						<Bot size={24} />
					</div>
					<span className="font-bold text-card-foreground text-xl">
						PagePal
					</span>
				</Link>
				<button
					type="button"
					onClick={toggleTheme}
					className="rounded-lg border-2 border-primary/50 p-2 text-muted-foreground hover:border-primary hover:text-foreground"
					aria-label={
						theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
					}
				>
					{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
				</button>
			</div>
		</div>
	);
}
