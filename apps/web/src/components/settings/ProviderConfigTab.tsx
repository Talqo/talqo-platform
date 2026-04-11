import { Plug } from "lucide-react"
import { useState } from "react"
import anthropicIcon from "@/assets/anthropic.svg"
import googleIcon from "@/assets/google.svg"
import openaiIcon from "@/assets/openai.svg"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"

type ProviderType = "openai" | "openai_compatible" | "google" | "anthropic"

type SavedConfig = {
	providerType: ProviderType
	apiKeyMasked: string
	model: string
	baseUrl: string | null
	updatedAt: string
}

const PROVIDER_LABELS: Record<ProviderType, string> = {
	openai: "OpenAI",
	openai_compatible: "OpenAI Compatible",
	google: "Google Gemini",
	anthropic: "Anthropic",
}

const MODEL_PLACEHOLDERS: Record<ProviderType, string> = {
	openai: "gpt-4o, gpt-4o-mini",
	openai_compatible: "depends on endpoint",
	google: "gemini-2.0-flash, gemini-1.5-pro",
	anthropic: "claude-sonnet-4-6, claude-haiku-4-5",
}

// Mock saved config — replace with real API query (null = using platform default)
const MOCK_SAVED: SavedConfig | null = null

function ProviderBadge({ type }: { type: ProviderType }) {
	const colors: Record<ProviderType, string> = {
		openai: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
		openai_compatible: "bg-violet-500/10 text-violet-600 border-violet-500/20",
		google: "bg-sky-500/10 text-sky-600 border-sky-500/20",
		anthropic: "bg-amber-500/10 text-amber-600 border-amber-500/20",
	}
	return (
		<span
			className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-xs ${colors[type]}`}
		>
			{PROVIDER_LABELS[type]}
		</span>
	)
}

function PlatformDefaultState({ onConfigure }: { onConfigure: () => void }) {
	return (
		<div className="space-y-4">
			<div className="rounded-lg border border-border bg-muted/20 p-4">
				<div className="flex items-start gap-3">
					<div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
						<span className="text-primary text-sm">✓</span>
					</div>
					<div>
						<p className="font-medium text-foreground text-sm">
							Using platform-hosted AI
						</p>
						<p className="mt-0.5 text-muted-foreground text-sm">
							Your chatbot is running on the platform's managed AI. No
							configuration needed.
						</p>
					</div>
				</div>
			</div>
			<div className="mt-4 rounded-lg border border-border border-dashed p-4">
				<p className="mb-3 text-muted-foreground text-sm">
					Want to use your own API key? You can connect OpenAI, Anthropic,
					Google Gemini, or any OpenAI-compatible endpoint. Your provider will
					be used instead of the platform default.
				</p>
				<Button variant="outline" size="sm" onClick={onConfigure}>
					Configure custom provider
				</Button>
			</div>
		</div>
	)
}

function ActiveProviderState({
	config,
	onEdit,
	onDelete,
}: {
	config: SavedConfig
	onEdit: () => void
	onDelete: () => void
}) {
	return (
		<div className="space-y-4">
			<div className="rounded-lg border border-border bg-muted/30 p-4">
				<div className="mb-3 flex items-center justify-between">
					<span className="font-medium text-foreground text-sm">
						Custom provider active
					</span>
					<ProviderBadge type={config.providerType} />
				</div>
				<dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
					<dt className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
						Model
					</dt>
					<dd className="font-mono text-foreground">{config.model}</dd>

					<dt className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
						API Key
					</dt>
					<dd className="font-mono text-foreground">{config.apiKeyMasked}</dd>

					{config.baseUrl && (
						<>
							<dt className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
								Base URL
							</dt>
							<dd className="break-all font-mono text-foreground">
								{config.baseUrl}
							</dd>
						</>
					)}

					<dt className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
						Updated
					</dt>
					<dd className="text-muted-foreground">
						{new Date(config.updatedAt).toLocaleString()}
					</dd>
				</dl>
			</div>
			<div className="flex gap-2">
				<Button variant="outline" size="sm" onClick={onEdit}>
					Change provider
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className="text-destructive hover:text-destructive"
					onClick={onDelete}
				>
					Remove — revert to platform default
				</Button>
			</div>
		</div>
	)
}

function ProviderConfigForm({
	onCancel,
	showCancel,
}: {
	onCancel?: () => void
	showCancel: boolean
}) {
	const [providerType, setProviderType] = useState<ProviderType>("openai")
	const [apiKey, setApiKey] = useState("")
	const [model, setModel] = useState("")
	const [baseUrl, setBaseUrl] = useState("")
	const [saving, setSaving] = useState(false)

	const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault()
		setSaving(true)
		// TODO: wire to API mutation
		await new Promise((r) => setTimeout(r, 600))
		setSaving(false)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-5">
			<div className="space-y-2">
				<Label htmlFor="provider-type">Provider</Label>
				<Select
					value={providerType}
					onValueChange={(v) => setProviderType(v as ProviderType)}
				>
					<SelectTrigger id="provider-type" className="w-full">
						<SelectValue placeholder="Select provider" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="openai">
							<span className="flex items-center gap-2">
								<img
									src={openaiIcon}
									alt=""
									width={16}
									height={16}
									className="dark:invert"
								/>
								OpenAI
							</span>
						</SelectItem>
						<SelectItem value="openai_compatible">
							<span className="flex items-center gap-2">
								<Plug size={16} />
								OpenAI Compatible
							</span>
						</SelectItem>
						<SelectItem value="google">
							<span className="flex items-center gap-2">
								<img
									src={googleIcon}
									alt=""
									width={16}
									height={16}
									className="dark:invert"
								/>
								Google Gemini
							</span>
						</SelectItem>
						<SelectItem value="anthropic">
							<span className="flex items-center gap-2">
								<img
									src={anthropicIcon}
									alt=""
									width={16}
									height={16}
									className="dark:invert"
								/>
								Anthropic
							</span>
						</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2">
				<Label htmlFor="api-key">API Key</Label>
				<Input
					id="api-key"
					type="password"
					autoComplete="new-password"
					placeholder="Paste your API key"
					value={apiKey}
					onChange={(e) => setApiKey(e.target.value)}
					required
				/>
				<p className="text-muted-foreground text-xs">
					Stored encrypted. Only the last 4 characters are shown after saving.
				</p>
			</div>

			<div className="space-y-2">
				<Label htmlFor="model">Model</Label>
				<Input
					id="model"
					type="text"
					placeholder={MODEL_PLACEHOLDERS[providerType]}
					value={model}
					onChange={(e) => setModel(e.target.value)}
					required
				/>
			</div>

			{providerType === "openai_compatible" && (
				<div className="space-y-2">
					<Label htmlFor="base-url">
						Base URL{" "}
						<span className="text-destructive" aria-hidden="true">
							*
						</span>
					</Label>
					<Input
						id="base-url"
						type="url"
						placeholder="https://my.host/v1"
						value={baseUrl}
						onChange={(e) => setBaseUrl(e.target.value)}
						required
					/>
				</div>
			)}

			<div className="flex gap-2 pt-1">
				<Button type="submit" disabled={saving}>
					{saving ? "Saving…" : "Save provider"}
				</Button>
				{showCancel && onCancel && (
					<Button type="button" variant="ghost" onClick={onCancel}>
						Cancel
					</Button>
				)}
			</div>
		</form>
	)
}

export function ProviderConfigTab() {
	const savedConfig: SavedConfig | null = MOCK_SAVED
	const [configuring, setConfiguring] = useState(false)

	return (
		<Card>
			<CardHeader>
				<CardTitle>AI Provider</CardTitle>
				<CardDescription>
					Optionally bring your own AI provider and API key. By default your
					chatbot uses the platform-hosted AI — no setup required.
				</CardDescription>
			</CardHeader>

			<CardContent>
				{configuring || savedConfig ? (
					savedConfig && !configuring ? (
						<ActiveProviderState
							config={savedConfig}
							onEdit={() => setConfiguring(true)}
							onDelete={() => {
								/* TODO: wire delete mutation */
							}}
						/>
					) : (
						<ProviderConfigForm
							showCancel={true}
							onCancel={() => setConfiguring(false)}
						/>
					)
				) : (
					<PlatformDefaultState onConfigure={() => setConfiguring(true)} />
				)}
			</CardContent>
		</Card>
	)
}
