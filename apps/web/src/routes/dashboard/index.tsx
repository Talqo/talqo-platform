import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Bot, MessageSquare, User } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

const cards = [
	{
		to: "/dashboard/bots",
		title: "Bots",
		description: "Manage your chat bots and their behavior.",
		icon: Bot,
	},
	{
		to: "/dashboard/widget",
		title: "Widget",
		description: "Configure and preview your embedded widget.",
		icon: MessageSquare,
	},
	{
		to: "/dashboard/analytics",
		title: "Analytics",
		description: "View conversation and usage statistics.",
		icon: BarChart3,
	},
	{
		to: "/dashboard/account",
		title: "Account",
		description: "Update your profile and preferences.",
		icon: User,
	},
];

export const Route = createFileRoute("/dashboard/")({
	component: DashboardIndexPage,
});

function DashboardIndexPage() {
	return (
		<div className="mx-auto max-w-5xl space-y-8">
			<div>
				<h1 className="font-bold text-3xl text-foreground">Welcome to Talqo</h1>
				<p className="mt-2 text-muted-foreground">
					Manage your chat bots, widget, and analytics from one place.
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{cards.map(({ to, title, description, icon: Icon }) => (
					<Link key={to} to={to} className="group">
						<Card className="h-full transition-shadow hover:shadow-md">
							<CardHeader>
								<Icon className="mb-2 size-8 text-primary" />
								<CardTitle>{title}</CardTitle>
								<CardDescription>{description}</CardDescription>
							</CardHeader>
							<CardContent>
								<span className="font-medium text-primary text-sm group-hover:underline">
									Open {title} →
								</span>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>
		</div>
	);
}
