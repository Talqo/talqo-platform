import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "./-page-header";
import { useUpdateWidget, useWidget } from "./-widgets-query";

export const Route = createFileRoute("/dashboard/bot/$botId")({
	component: BotConfigPage,
});

function parseBlacklist(value: string): string[] {
	const words = value
		.split(",")
		.map((word) => word.trim())
		.filter(Boolean);
	return [...new Set(words)];
}

function BotConfigPage() {
	const { botId } = Route.useParams();
	const { data: bot, isLoading } = useWidget(botId);
	const updateWidget = useUpdateWidget();

	const [name, setName] = useState("");
	const [systemPrompt, setSystemPrompt] = useState("");
	const [blacklist, setBlacklist] = useState("");
	const [active, setActive] = useState(false);
	const [savedAt, setSavedAt] = useState<number | null>(null);

	// Populate the form once the bot loads (or reloads after an external edit).
	useEffect(() => {
		if (bot) {
			setName(bot.name);
			setSystemPrompt(bot.systemPrompt);
			setBlacklist(bot.wordBlacklist.join(", "));
			setActive(bot.status === "active");
		}
	}, [bot]);

	function handleSave(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		updateWidget(botId, {
			name: name.trim(),
			systemPrompt: systemPrompt.trim(),
			wordBlacklist: parseBlacklist(blacklist),
			status: active ? "active" : "paused",
		});
		setSavedAt(Date.now());
	}

	return (
		<div className="mx-auto max-w-3xl space-y-6">
			<Button asChild variant="ghost" className="-ml-2">
				<Link to="/dashboard/bots">
					<ArrowLeft className="size-4" />
					Back to bots
				</Link>
			</Button>

			{isLoading ? (
				<p className="text-muted-foreground">Loading bot…</p>
			) : !bot ? (
				<p className="text-muted-foreground">
					Bot not found. It may have been removed.
				</p>
			) : (
				<>
					<PageHeader
						title={`Configure ${bot.name}`}
						description="Update the bot's name, behavior, blocked words, and status."
					/>
					<Card>
						<CardHeader>
							<CardTitle>Bot configuration</CardTitle>
							<CardDescription>
								Changes are saved to the mock store and reflected across the
								dashboard.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleSave} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="config-name">Name</Label>
									<Input
										id="config-name"
										value={name}
										onChange={(event) => setName(event.target.value)}
										placeholder="Support Bot"
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="config-system-prompt">System prompt</Label>
									<Textarea
										id="config-system-prompt"
										value={systemPrompt}
										onChange={(event) => setSystemPrompt(event.target.value)}
										placeholder="You are a helpful customer support assistant..."
										rows={5}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="config-blacklist">Word blacklist</Label>
									<Input
										id="config-blacklist"
										value={blacklist}
										onChange={(event) => setBlacklist(event.target.value)}
										placeholder="spam, abuse, scam"
									/>
									<p className="text-muted-foreground text-xs">
										Separate words with commas.
									</p>
									{bot.wordBlacklist.length > 0 && (
										<div className="flex flex-wrap gap-1 pt-1">
											{bot.wordBlacklist.map((word) => (
												<Badge key={word} variant="outline">
													{word}
												</Badge>
											))}
										</div>
									)}
								</div>
								<div className="flex items-center gap-2">
									<Switch
										id="config-status"
										checked={active}
										onCheckedChange={setActive}
									/>
									<Label htmlFor="config-status">
										{active ? "Active" : "Paused"}
									</Label>
								</div>
								<div className="flex items-center gap-3 pt-2">
									<Button type="submit">Save changes</Button>
									{savedAt && (
										<span className="text-muted-foreground text-sm">
											Saved just now.
										</span>
									)}
								</div>
							</form>
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}
