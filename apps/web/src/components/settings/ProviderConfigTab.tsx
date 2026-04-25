import { zodResolver } from "@hookform/resolvers/zod"
import { Plug } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import type { ProviderType } from "shared"
import {
	type ProviderConfigResponse,
	useDeleteProviderConfig,
	useProviderConfig,
	useUpsertProviderConfig,
} from "@/api/hooks/useProviderConfig"
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
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import {
	type ProviderConfigFormValues,
	providerConfigFormSchema,
} from "@/schemas/provider-config"

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
	deleting,
	deleteError,
}: {
	config: NonNullable<ProviderConfigResponse>
	onEdit: () => void
	onDelete: () => void
	deleting: boolean
	deleteError?: Error | null
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
					disabled={deleting}
				>
					{deleting ? "Removing…" : "Remove"}
				</Button>
			</div>
			{deleteError && (
				<p className="text-destructive text-sm">
					Failed to remove provider. Please try again.
				</p>
			)}
		</div>
	)
}

function ProviderConfigForm({
	config,
	onCancel,
	onSaved,
	showCancel,
}: {
	config?: ProviderConfigResponse | null
	onCancel?: () => void
	onSaved: () => void
	showCancel: boolean
}) {
	const upsert = useUpsertProviderConfig()

	const form = useForm<ProviderConfigFormValues>({
		resolver: zodResolver(providerConfigFormSchema),
		defaultValues: {
			providerType: config?.providerType ?? "openai",
			apiKey: "",
			model: config?.model ?? "",
			baseUrl: config?.baseUrl ?? "",
		},
		mode: "onBlur",
	})

	useEffect(() => {
		if (config) {
			form.reset({
				providerType: config.providerType,
				apiKey: "",
				model: config.model,
				baseUrl: config.baseUrl ?? "",
			})
		}
	}, [config, form])

	const providerType = form.watch("providerType")

	const onSubmit = async (values: ProviderConfigFormValues) => {
		try {
			// TypeScript discriminated union requires explicit ternary to narrow types
			const payload =
				values.providerType === "openai_compatible"
					? {
							providerType: values.providerType,
							apiKey: values.apiKey,
							model: values.model,
							baseUrl: values.baseUrl,
						}
					: {
							providerType: values.providerType,
							apiKey: values.apiKey,
							model: values.model,
							...(values.baseUrl ? { baseUrl: values.baseUrl } : {}),
						}
			await upsert.mutateAsync(payload)
			onSaved()
		} catch {
			// Error is displayed via upsert.error below the form
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
				<FormField
					control={form.control}
					name="providerType"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Provider</FormLabel>
							<Select
								value={field.value}
								onValueChange={(v) => {
									field.onChange(v)
									if (v !== "openai_compatible") {
										form.setValue("baseUrl", "")
									}
								}}
							>
								<FormControl>
									<SelectTrigger id="provider-type" className="w-full">
										<SelectValue placeholder="Select provider" />
									</SelectTrigger>
								</FormControl>
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
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="apiKey"
					render={({ field }) => (
						<FormItem>
							<FormLabel>API Key</FormLabel>
							<FormControl>
								<Input
									type="password"
									autoComplete="new-password"
									placeholder="Paste your API key"
									{...field}
								/>
							</FormControl>
							<p className="text-muted-foreground text-xs">
								Stored encrypted. Only the last 4 characters are shown after
								saving.
							</p>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="model"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Model</FormLabel>
							<FormControl>
								<Input
									type="text"
									placeholder={MODEL_PLACEHOLDERS[providerType]}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{providerType === "openai_compatible" && (
					<FormField
						control={form.control}
						name="baseUrl"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									Base URL{" "}
									<span className="text-destructive" aria-hidden="true">
										*
									</span>
								</FormLabel>
								<FormControl>
									<Input
										type="url"
										placeholder="https://my.host/v1"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				{upsert.error && (
					<p className="text-destructive text-sm">
						Failed to save. Please try again.
					</p>
				)}

				<div className="flex gap-2 pt-1">
					<Button type="submit" disabled={upsert.isPending}>
						{upsert.isPending ? "Saving…" : "Save provider"}
					</Button>
					{showCancel && onCancel && (
						<Button type="button" variant="ghost" onClick={onCancel}>
							Cancel
						</Button>
					)}
				</div>
			</form>
		</Form>
	)
}

export function ProviderConfigTab() {
	const { data: savedConfig, isLoading, error } = useProviderConfig()
	const deleteMutation = useDeleteProviderConfig()
	const [configuring, setConfiguring] = useState(false)

	if (isLoading) {
		return (
			<Card>
				<CardContent className="pt-6">
					<p className="text-muted-foreground text-sm">Loading…</p>
				</CardContent>
			</Card>
		)
	}

	if (error) {
		return (
			<Card>
				<CardContent className="pt-6">
					<p className="text-destructive text-sm">
						Failed to load provider config. Please refresh the page.
					</p>
				</CardContent>
			</Card>
		)
	}

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
								if (
									window.confirm(
										"Remove your custom AI provider? Your chatbot will revert to the platform default.",
									)
								) {
									deleteMutation.mutate()
								}
							}}
							deleting={deleteMutation.isPending}
							deleteError={deleteMutation.error}
						/>
					) : (
						<ProviderConfigForm
							config={savedConfig}
							showCancel={true}
							onCancel={() => setConfiguring(false)}
							onSaved={() => setConfiguring(false)}
						/>
					)
				) : (
					<PlatformDefaultState onConfigure={() => setConfiguring(true)} />
				)}
			</CardContent>
		</Card>
	)
}
