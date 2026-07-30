import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Settings2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "./-page-header";
import {
	useCreateWidget,
	useUpdateWidget,
	useWidgets,
	type Widget,
} from "./-widgets-query";

export const Route = createFileRoute("/dashboard/bots")({
	component: BotsPage,
});

function parseBlacklist(value: string): string[] {
	const words = value
		.split(",")
		.map((word) => word.trim())
		.filter(Boolean);
	return [...new Set(words)];
}

function BotsPage() {
	const { data: bots, isLoading } = useWidgets();
	const [dialogOpen, setDialogOpen] = useState(false);
	const createWidget = useCreateWidget();
	const updateWidget = useUpdateWidget();

	function toggleStatus(bot: Widget) {
		updateWidget(bot.id, {
			status: bot.status === "active" ? "paused" : "active",
		});
	}

	function handleCreate(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const name = String(form.get("name") ?? "").trim();
		const systemPrompt = String(form.get("systemPrompt") ?? "").trim();
		if (!name || !systemPrompt) {
			return;
		}
		createWidget({
			name,
			systemPrompt,
			status: "active",
			wordBlacklist: parseBlacklist(String(form.get("wordBlacklist") ?? "")),
		});
		setDialogOpen(false);
	}

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<PageHeader
				title="Bots"
				description="Manage your chat bots and their behavior."
				actions={
					<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
						<DialogTrigger asChild>
							<Button>
								<Plus className="size-4" />
								Create bot
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Create bot</DialogTitle>
								<DialogDescription>
									Define the bot's name, behavior, and blocked words.
								</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleCreate} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="bot-name">Name</Label>
									<Input
										id="bot-name"
										name="name"
										placeholder="Support Bot"
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="bot-system-prompt">System prompt</Label>
									<Textarea
										id="bot-system-prompt"
										name="systemPrompt"
										placeholder="You are a helpful customer support assistant..."
										rows={4}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="bot-word-blacklist">Word blacklist</Label>
									<Input
										id="bot-word-blacklist"
										name="wordBlacklist"
										placeholder="spam, abuse, scam"
									/>
									<p className="text-muted-foreground text-xs">
										Separate words with commas.
									</p>
								</div>
								<DialogFooter>
									<Button type="submit">Create bot</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				}
			/>

			{isLoading ? (
				<p className="text-muted-foreground">Loading bots…</p>
			) : !bots?.length ? (
				<p className="text-muted-foreground">
					No bots yet. Create your first bot to get started.
				</p>
			) : (
				<div className="grid gap-4 md:grid-cols-2">
					{bots.map((bot) => (
						<Card key={bot.id}>
							<CardHeader>
								<div className="flex items-center justify-between gap-2">
									<CardTitle>{bot.name}</CardTitle>
									<Badge
										variant={bot.status === "active" ? "default" : "secondary"}
									>
										{bot.status}
									</Badge>
								</div>
								<CardDescription className="line-clamp-2">
									{bot.systemPrompt}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{bot.wordBlacklist.length > 0 && (
									<div className="flex flex-wrap gap-1">
										{bot.wordBlacklist.map((word) => (
											<Badge key={word} variant="outline">
												{word}
											</Badge>
										))}
									</div>
								)}
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<Switch
											id={`status-${bot.id}`}
											checked={bot.status === "active"}
											onCheckedChange={() => toggleStatus(bot)}
										/>
										<Label htmlFor={`status-${bot.id}`}>
											{bot.status === "active" ? "Active" : "Paused"}
										</Label>
									</div>
									<Button asChild variant="outline" size="sm">
										<Link to="/dashboard/bot/$botId" params={{ botId: bot.id }}>
											<Settings2 className="size-4" />
											Configure
										</Link>
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
