import { zodResolver } from "@hookform/resolvers/zod"
import { Plug } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
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
	createProviderConfigFormSchema,
	type ProviderConfigFormValues,
} from "@/schemas/provider-config"

const MODEL_PLACEHOLDERS: Record<ProviderType, string> = {
	openai: "gpt-4o, gpt-4o-mini",
	openai_compatible: "depends on endpoint",
	google: "gemini-2.0-flash, gemini-1.5-pro",
	anthropic: "claude-sonnet-4-6, claude-haiku-4-5",
}

function ProviderLabel({ type }: { type: ProviderType }) {
	const { t } = useTranslation()
	const labels: Record<ProviderType, string> = {
		openai: t("settings.provider.openai"),
		openai_compatible: t("settings.provider.openaiCompatible"),
		google: t("settings.provider.googleGemini"),
		anthropic: t("settings.provider.anthropic"),
	}
	return <>{labels[type]}</>
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
			<ProviderLabel type={type} />
		</span>
	)
}

function PlatformDefaultState({ onConfigure }: { onConfigure: () => void }) {
	const { t } = useTranslation()
	return (
		<div className="space-y-4">
			<div className="rounded-lg border border-border bg-muted/20 p-4">
				<div className="flex items-start gap-3">
					<div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
						<span className="text-primary text-sm">✓</span>
					</div>
					<div>
						<p className="font-medium text-foreground text-sm">
							{t("settings.provider.platformHosted")}
						</p>
						<p className="mt-0.5 text-muted-foreground text-sm">
							{t("settings.provider.platformHostedDescription")}
						</p>
					</div>
				</div>
			</div>
			<div className="mt-4 rounded-lg border border-border border-dashed p-4">
				<p className="mb-3 text-muted-foreground text-sm">
					{t("settings.provider.bringYourOwn")}
				</p>
				<Button variant="outline" size="sm" onClick={onConfigure}>
					{t("settings.provider.configureCustom")}
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
	const { t } = useTranslation()
	return (
		<div className="space-y-4">
			<div className="rounded-lg border border-border bg-muted/30 p-4">
				<div className="mb-3 flex items-center justify-between">
					<span className="font-medium text-foreground text-sm">
						{t("settings.provider.customActive")}
					</span>
					<ProviderBadge type={config.providerType} />
				</div>
				<dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
					<dt className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
						{t("settings.provider.model")}
					</dt>
					<dd className="font-mono text-foreground">{config.model}</dd>

					<dt className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
						{t("settings.provider.apiKeyMasked")}
					</dt>
					<dd className="font-mono text-foreground">{config.apiKeyMasked}</dd>

					{config.baseUrl && (
						<>
							<dt className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
								{t("settings.provider.baseUrl")}
							</dt>
							<dd className="break-all font-mono text-foreground">
								{config.baseUrl}
							</dd>
						</>
					)}

					<dt className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
						{t("settings.provider.updated")}
					</dt>
					<dd className="text-muted-foreground">
						{new Date(config.updatedAt).toLocaleString()}
					</dd>
				</dl>
			</div>
			<div className="flex gap-2">
				<Button variant="outline" size="sm" onClick={onEdit}>
					{t("settings.provider.changeProvider")}
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className="text-destructive hover:text-destructive"
					onClick={onDelete}
					disabled={deleting}
				>
					{deleting
						? t("settings.provider.removing")
						: t("settings.provider.remove")}
				</Button>
			</div>
			{deleteError && (
				<p className="text-destructive text-sm">
					{t("settings.provider.removeFailed")}
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
	const { t } = useTranslation()
	const upsert = useUpsertProviderConfig()
	const providerConfigFormSchema = useMemo(
		() => createProviderConfigFormSchema(t),
		[t],
	)

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
							<FormLabel>{t("settings.provider.providerLabel")}</FormLabel>
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
										<SelectValue
											placeholder={t("settings.provider.selectProvider")}
										/>
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
											{t("settings.provider.openai")}
										</span>
									</SelectItem>
									<SelectItem value="openai_compatible">
										<span className="flex items-center gap-2">
											<Plug size={16} />
											{t("settings.provider.openaiCompatible")}
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
											{t("settings.provider.googleGemini")}
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
											{t("settings.provider.anthropic")}
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
							<FormLabel>{t("settings.provider.apiKeyMasked")}</FormLabel>
							<FormControl>
								<Input
									type="password"
									autoComplete="new-password"
									placeholder={t("settings.provider.apiKeyPlaceholder")}
									{...field}
								/>
							</FormControl>
							<p className="text-muted-foreground text-xs">
								{t("settings.provider.apiKeyEncrypted")}
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
							<FormLabel>{t("settings.provider.model")}</FormLabel>
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
									{t("settings.provider.baseUrlRequired")}{" "}
									<span className="text-destructive" aria-hidden="true">
										*
									</span>
								</FormLabel>
								<FormControl>
									<Input
										type="url"
										placeholder={t("settings.provider.baseUrlPlaceholder")}
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
						{t("settings.provider.saveFailed")}
					</p>
				)}

				<div className="flex gap-2 pt-1">
					<Button type="submit" disabled={upsert.isPending}>
						{upsert.isPending
							? t("settings.provider.saving")
							: t("settings.provider.saveProvider")}
					</Button>
					{showCancel && onCancel && (
						<Button type="button" variant="ghost" onClick={onCancel}>
							{t("cancel")}
						</Button>
					)}
				</div>
			</form>
		</Form>
	)
}

export function ProviderConfigTab() {
	const { t } = useTranslation()
	const { data: savedConfig, isLoading, error } = useProviderConfig()
	const deleteMutation = useDeleteProviderConfig()
	const [configuring, setConfiguring] = useState(false)

	if (isLoading) {
		return (
			<Card>
				<CardContent className="pt-6">
					<p className="text-muted-foreground text-sm">
						{t("settings.provider.loading")}
					</p>
				</CardContent>
			</Card>
		)
	}

	if (error) {
		return (
			<Card>
				<CardContent className="pt-6">
					<p className="text-destructive text-sm">
						{t("settings.provider.loadFailed")}
					</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("settings.provider.title")}</CardTitle>
				<CardDescription>{t("settings.provider.description")}</CardDescription>
			</CardHeader>

			<CardContent>
				{configuring || savedConfig ? (
					savedConfig && !configuring ? (
						<ActiveProviderState
							config={savedConfig}
							onEdit={() => setConfiguring(true)}
							onDelete={() => {
								if (window.confirm(t("settings.provider.removeConfirm"))) {
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
