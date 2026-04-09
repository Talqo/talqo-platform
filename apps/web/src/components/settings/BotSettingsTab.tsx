import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function BotSettingsTab() {
	return (
		<Card className="mb-4">
			<CardHeader>
				<CardTitle>Bot Personality & Rules</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="bot-prompt">Context</Label>
					<Textarea
						id="bot-prompt"
						className="min-h-[160px]"
						placeholder="Define the behavior and context for your AI assistant..."
					/>
					<p className="text-muted-foreground text-sm">
						Configure how your AI should respond to users.
					</p>
				</div>
				<div className="space-y-2">
					<Label htmlFor="bot-blacklist">
						Word Blacklist (comma separated)
					</Label>
					<Textarea
						id="bot-blacklist"
						placeholder="competitor-name, swear-word"
						className="min-h-[80px] resize-y"
					/>
					<p className="text-muted-foreground text-sm">
						Expands if the list gets too long.
					</p>
				</div>
			</CardContent>
			<CardFooter className="flex justify-end">
				<Button variant="default">Save Configuration</Button>
			</CardFooter>
		</Card>
	);
}
