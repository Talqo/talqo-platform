import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function HeroSection() {
	return (
		<section className="container mx-auto px-6 py-24 text-center sm:py-32">
			<h1 className="font-bold text-4xl text-foreground tracking-tight sm:text-6xl">
				The intelligent chat widget <br className="hidden sm:inline" />
				for your business.
			</h1>
			<p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-8">
				Embed a fully customizable, context-aware AI chatbot directly into your
				website. Connect your own knowledge bases and let your customers find
				answers instantly.
			</p>
			<div className="mt-10 flex items-center justify-center gap-x-6">
				<Button size="lg" asChild>
					<Link to="/register">Start for free</Link>
				</Button>
				<Button variant="outline-primary" size="lg" asChild>
					<Link to="/login">View Demo Dashboard</Link>
				</Button>
			</div>
		</section>
	);
}
