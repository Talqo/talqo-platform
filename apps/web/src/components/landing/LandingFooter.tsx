import { Bot } from "lucide-react";

export function LandingFooter() {
	return (
		<footer className="border-border border-t bg-background py-8 text-foreground">
			<div className="container mx-auto flex flex-col items-center justify-between gap-4 px-6 sm:flex-row">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
						<Bot size={16} />
					</div>
					<span className="font-black text-sm">Talqo</span>
				</div>
				<p className="text-muted-foreground text-sm">
					&copy; {new Date().getFullYear()} Talqo. All rights reserved.
				</p>
			</div>
		</footer>
	);
}
