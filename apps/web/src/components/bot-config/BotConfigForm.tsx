import { zodResolver } from "@hookform/resolvers/zod"
import { useCallback, useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import {
	type BotConfigFields as BotConfigSchema,
	botConfigFieldsSchema,
} from "shared"
import { useBotConfig, useUpdateBotConfig } from "@/api/hooks/useBotConfig"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

const botConfigSchema = botConfigFieldsSchema

type Feedback = { type: "success" | "error"; message: string }

// API returns null for unset fields; form uses empty string
function fromApi(v: string | null | undefined): string {
	return v ?? ""
}

// Map empty string back to null for the API (means "unset")
function toApi(v: string): string | null {
	return v.trim() === "" ? null : v
}

type BotConfigApiData = {
	systemPrompt?: string | null
	defaultRole?: string | null
	toneStyle?: string | null
}

type BotConfigFormInnerProps = {
	data: BotConfigApiData
}

function BotConfigFormInner({ data }: BotConfigFormInnerProps) {
	const { t } = useTranslation()
	const updateBotConfig = useUpdateBotConfig()
	const [feedback, setFeedback] = useState<Feedback | null>(null)
	const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const clearFeedback = useCallback(() => {
		if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
		feedbackTimerRef.current = setTimeout(() => setFeedback(null), 5000)
	}, [])

	useEffect(() => {
		return () => {
			if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
		}
	}, [])

	const form = useForm<BotConfigSchema>({
		resolver: zodResolver(botConfigSchema),
		defaultValues: {
			systemPrompt: fromApi(data.systemPrompt),
			defaultRole: fromApi(data.defaultRole),
			toneStyle: fromApi(data.toneStyle),
		},
		mode: "onBlur",
	})

	useEffect(() => {
		form.reset(
			{
				systemPrompt: fromApi(data.systemPrompt),
				defaultRole: fromApi(data.defaultRole),
				toneStyle: fromApi(data.toneStyle),
			},
			{ keepDirtyValues: true },
		)
	}, [data, form])

	const onSubmit = async (values: BotConfigSchema) => {
		try {
			await updateBotConfig.mutateAsync({
				systemPrompt: toApi(values.systemPrompt),
				defaultRole: toApi(values.defaultRole),
				toneStyle: toApi(values.toneStyle),
			})
			setFeedback({
				type: "success",
				message: t("botConfig.configSaved"),
			})
			clearFeedback()
		} catch (err) {
			if (import.meta.env.DEV) {
				console.error("Failed to save bot config:", err)
			}
			setFeedback({
				type: "error",
				message: t("botConfig.saveFailed"),
			})
			clearFeedback()
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("botConfig.personalityTitle")}</CardTitle>
			</CardHeader>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<CardContent className="space-y-4">
						{feedback && (
							<Alert
								variant={feedback.type === "error" ? "destructive" : "default"}
							>
								<AlertDescription>{feedback.message}</AlertDescription>
							</Alert>
						)}

						<FormField
							control={form.control}
							name="systemPrompt"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("botConfig.systemPromptLabel")}</FormLabel>
									<FormControl>
										<Textarea
											className="min-h-40"
											placeholder={t("botConfig.systemPromptPlaceholder")}
											{...field}
										/>
									</FormControl>
									<FormDescription>
										{t("botConfig.systemPromptDescription")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="defaultRole"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("botConfig.defaultRoleLabel")}</FormLabel>
									<FormControl>
										<Input
											placeholder={t("botConfig.defaultRolePlaceholder")}
											{...field}
										/>
									</FormControl>
									<FormDescription>
										{t("botConfig.defaultRoleDescription")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="toneStyle"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("botConfig.toneStyleLabel")}</FormLabel>
									<FormControl>
										<Input
											placeholder={t("botConfig.toneStylePlaceholder")}
											{...field}
										/>
									</FormControl>
									<FormDescription>
										{t("botConfig.toneStyleDescription")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
					</CardContent>
					<CardFooter className="flex justify-end">
						<Button type="submit" disabled={form.formState.isSubmitting}>
							{form.formState.isSubmitting
								? t("botConfig.saving")
								: t("botConfig.saveConfiguration")}
						</Button>
					</CardFooter>
				</form>
			</Form>
		</Card>
	)
}

function BotConfigFormSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Bot Personality & Behavior</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-40 w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-10 w-full" />
				</div>
			</CardContent>
			<CardFooter className="flex justify-end">
				<Skeleton className="h-10 w-36" />
			</CardFooter>
		</Card>
	)
}

export function BotConfigForm() {
	const { t } = useTranslation()
	const { data, isLoading, isError } = useBotConfig()

	if (isError) {
		return (
			<Alert variant="destructive">
				<AlertDescription>{t("botConfig.loadFailed")}</AlertDescription>
			</Alert>
		)
	}

	if (isLoading || !data) return <BotConfigFormSkeleton />

	return <BotConfigFormInner data={data} />
}
