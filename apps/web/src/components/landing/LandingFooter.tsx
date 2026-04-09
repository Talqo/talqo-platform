import { Bot } from "lucide-react";

export function LandingFooter() {
	return (
		<footer className="border-border border-t py-8">
			<div className="container mx-auto flex flex-col items-center justify-between gap-4 px-6 sm:flex-row">
				<div className="flex items-center gap-2">
					<Bot size={16} className="text-foreground" />
					<span className="font-semibold text-foreground text-sm">PagePal</span>
				</div>
				<p className="text-muted-foreground text-sm">
					&copy; {new Date().getFullYear()} PagePal. All rights reserved.
				</p>
			</div>
		</footer>
	);
}
