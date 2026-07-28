import { EmbeddedWidget } from "@talqo/widget";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy, ExternalLink } from "lucide-react";
import { type CSSProperties, useState } from "react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useWidgets } from "./-widgets-query";

export const Route = createFileRoute("/dashboard/widget")({
	component: WidgetPage,
});

function buildEmbedSnippet(botId: string) {
	return [
		"<script",
		'  src="https://cdn.talqo.dev/widget/v1.js"',
		`  data-talqo-bot="${botId}"`,
		"  defer",
		"></script>",
	].join("\n");
}

const positions = [
	{ value: "bottom-right", label: "Bottom right" },
	{ value: "bottom-left", label: "Bottom left" },
] as const;

const languages = [
	{ value: "en", label: "English" },
	{ value: "cs", label: "Czech" },
	{ value: "de", label: "German" },
] as const;

function WidgetPage() {
	const { data: widgets } = useWidgets();
	const [selectedBotId, setSelectedBotId] = useState("");
	const [copied, setCopied] = useState(false);
	const [accentColor, setAccentColor] = useState("#1a7f4b");
	const [position, setPosition] = useState<string>("bottom-right");
	const [showThemeSwitch, setShowThemeSwitch] = useState(true);
	const [language, setLanguage] = useState<string>("en");
	const [avatarUrl, setAvatarUrl] = useState("");

	const activeBotId = selectedBotId || widgets?.[0]?.id || "";
	const snippet = buildEmbedSnippet(activeBotId);

	async function copySnippet() {
		try {
			await navigator.clipboard.writeText(snippet);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			setCopied(false);
		}
	}

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="font-bold text-3xl text-foreground">Widget setup</h1>
					<p className="mt-2 text-muted-foreground">
						Embed the chat widget on your site and tune its appearance.
					</p>
				</div>
				<Button asChild variant="outline">
					<Link to="/widget-preview">
						<ExternalLink className="size-4" />
						Open full-screen preview
					</Link>
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Embed code</CardTitle>
					<CardDescription>
						Paste this snippet before the closing body tag of your site.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="max-w-xs space-y-2">
						<Label htmlFor="embed-bot">Bot</Label>
						<Select value={activeBotId} onValueChange={setSelectedBotId}>
							<SelectTrigger id="embed-bot" className="w-full">
								<SelectValue placeholder="Select a bot" />
							</SelectTrigger>
							<SelectContent>
								{(widgets ?? []).map((widget) => (
									<SelectItem key={widget.id} value={widget.id}>
										{widget.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="relative">
						<pre className="overflow-x-auto rounded-lg border bg-muted p-4 font-mono text-sm">
							{snippet}
						</pre>
						<Button
							variant="outline"
							size="icon"
							className="absolute top-2 right-2"
							onClick={copySnippet}
							aria-label="Copy embed code"
						>
							{copied ? (
								<Check className="size-4 text-primary" />
							) : (
								<Copy className="size-4" />
							)}
						</Button>
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Appearance</CardTitle>
						<CardDescription>
							Visual configuration applied to the embedded widget.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="accent-color">Accent color</Label>
							<div className="flex items-center gap-2">
								<input
									id="accent-color"
									type="color"
									value={accentColor}
									onChange={(event) => setAccentColor(event.target.value)}
									className="h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1"
								/>
								<Input
									value={accentColor}
									onChange={(event) => setAccentColor(event.target.value)}
									className="w-28 font-mono"
									aria-label="Accent color hex value"
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="widget-position">Position</Label>
							<Select value={position} onValueChange={setPosition}>
								<SelectTrigger id="widget-position" className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{positions.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="widget-language">Language</Label>
							<Select value={language} onValueChange={setLanguage}>
								<SelectTrigger id="widget-language" className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{languages.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="avatar-url">Avatar URL</Label>
							<Input
								id="avatar-url"
								type="url"
								placeholder="https://example.com/avatar.png"
								value={avatarUrl}
								onChange={(event) => setAvatarUrl(event.target.value)}
							/>
						</div>
						<div className="flex items-center gap-2">
							<Switch
								id="theme-switch"
								checked={showThemeSwitch}
								onCheckedChange={setShowThemeSwitch}
							/>
							<Label htmlFor="theme-switch">
								Show theme switch in widget header
							</Label>
						</div>
						<p className="text-muted-foreground text-xs">
							Configuration is not persisted yet; it previews how the setup
							screen will behave.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Live preview</CardTitle>
						<CardDescription>
							The widget rendered as it would appear on your site.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="overflow-hidden rounded-lg border">
							<div className="flex items-center gap-1.5 border-b bg-muted px-3 py-2">
								<span className="size-2.5 rounded-full bg-destructive/70" />
								<span className="size-2.5 rounded-full bg-chart-4" />
								<span className="size-2.5 rounded-full bg-primary/70" />
								<span className="ml-2 text-muted-foreground text-xs">
									your-site.com
								</span>
							</div>
							<div
								className="relative h-80 bg-background"
								style={{ "--talqo-primary": accentColor } as CSSProperties}
							>
								<div
									className={`absolute bottom-4 ${
										position === "bottom-left" ? "left-4" : "right-4"
									}`}
								>
									<EmbeddedWidget title="AI Chat" />
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
