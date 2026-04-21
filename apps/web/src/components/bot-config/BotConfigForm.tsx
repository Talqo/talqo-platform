import { useCallback, useEffect, useRef, useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "@/lib/useForm"

const botConfigSchema = botConfigFieldsSchema

type Feedback = { type: "success" | "error"; message: string }

// API returns null for unset fields; useForm requires string | boolean
function fromApi(v: string | null | undefined): string {
	return v ?? ""
}

// Map empty string back to null for the API (means "unset")
function toApi(v: string): string | null {
	return v.trim() === "" ? null : v
}

function validate(values: BotConfigSchema) {
	const result = botConfigSchema.safeParse(values)
	if (result.success) return {}
	const errors: Partial<Record<keyof BotConfigSchema, string>> = {}
	for (const issue of result.error.issues) {
		const field = issue.path[0] as keyof BotConfigSchema
		if (!errors[field]) errors[field] = issue.message
	}
	return errors
}

type BotConfigFormInnerProps = {
	initialValues: BotConfigSchema
}

function BotConfigFormInner({ initialValues }: BotConfigFormInnerProps) {
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

	const {
		values,
		errors,
		touched,
		isSubmitting,
		handleChange,
		handleBlur,
		handleSubmit,
	} = useForm<BotConfigSchema>({
		initialValues,
		validate,
		onSubmit: async (vals) => {
			try {
				await updateBotConfig.mutateAsync({
					systemPrompt: toApi(vals.systemPrompt),
					defaultRole: toApi(vals.defaultRole),
					toneStyle: toApi(vals.toneStyle),
					internetSearchEnabled: vals.internetSearchEnabled,
				})
				setFeedback({ type: "success", message: "Configuration saved." })
				clearFeedback()
			} catch {
				setFeedback({
					type: "error",
					message: "Failed to save. Please try again.",
				})
			}
		},
	})

	return (
		<Card>
			<CardHeader>
				<CardTitle>Bot Personality & Behavior</CardTitle>
			</CardHeader>
			<form onSubmit={handleSubmit}>
				<CardContent className="space-y-4">
					{feedback && (
						<Alert
							variant={feedback.type === "error" ? "destructive" : "default"}
						>
							<AlertDescription>{feedback.message}</AlertDescription>
						</Alert>
					)}

					<div className="space-y-2">
						<Label htmlFor="systemPrompt">System Prompt</Label>
						<Textarea
							id="systemPrompt"
							value={values.systemPrompt}
							onChange={(e) => handleChange("systemPrompt")(e.target.value)}
							onBlur={handleBlur("systemPrompt")}
							className="min-h-[160px]"
							placeholder="Define the behavior and context for your AI assistant..."
						/>
						<p className="text-muted-foreground text-sm">
							Instructions that define how your AI assistant responds to users.
						</p>
						{touched.systemPrompt && errors.systemPrompt && (
							<p className="text-destructive text-sm">{errors.systemPrompt}</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="defaultRole">Default Role</Label>
						<Input
							id="defaultRole"
							value={values.defaultRole}
							onChange={(e) => handleChange("defaultRole")(e.target.value)}
							onBlur={handleBlur("defaultRole")}
							placeholder='e.g. "Customer support agent for Acme Shop"'
						/>
						<p className="text-muted-foreground text-sm">
							The role your bot assumes when responding to users.
						</p>
						{touched.defaultRole && errors.defaultRole && (
							<p className="text-destructive text-sm">{errors.defaultRole}</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="toneStyle">Tone & Communication Style</Label>
						<Input
							id="toneStyle"
							value={values.toneStyle}
							onChange={(e) => handleChange("toneStyle")(e.target.value)}
							onBlur={handleBlur("toneStyle")}
							placeholder='e.g. "Professional but friendly"'
						/>
						<p className="text-muted-foreground text-sm">
							How the bot should sound in conversations with users.
						</p>
						{touched.toneStyle && errors.toneStyle && (
							<p className="text-destructive text-sm">{errors.toneStyle}</p>
						)}
					</div>

					<div className="flex items-center justify-between gap-4 pt-2">
						<div>
							<Label htmlFor="internetSearchEnabled">Internet Search</Label>
							<p className="text-muted-foreground text-sm">
								Allow the bot to search the internet for answers.
							</p>
						</div>
						<Switch
							id="internetSearchEnabled"
							checked={values.internetSearchEnabled}
							onCheckedChange={(checked) =>
								handleChange("internetSearchEnabled")(checked)
							}
						/>
					</div>
				</CardContent>
				<CardFooter className="flex justify-end">
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Saving..." : "Save Configuration"}
					</Button>
				</CardFooter>
			</form>
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
					<Skeleton className="h-[160px] w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="flex items-center justify-between pt-2">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-6 w-11 rounded-full" />
				</div>
			</CardContent>
			<CardFooter className="flex justify-end">
				<Skeleton className="h-10 w-36" />
			</CardFooter>
		</Card>
	)
}

export function BotConfigForm() {
	const { data, isLoading, isError } = useBotConfig()
	// Track whether we have materialized initial values to avoid stale-closure issues
	const [initialValues, setInitialValues] = useState<BotConfigSchema | null>(
		null,
	)

	useEffect(() => {
		if (data && !initialValues) {
			setInitialValues({
				systemPrompt: fromApi(data.systemPrompt),
				defaultRole: fromApi(data.defaultRole),
				toneStyle: fromApi(data.toneStyle),
				internetSearchEnabled: data.internetSearchEnabled,
			})
		}
	}, [data, initialValues])

	if (isError) {
		return (
			<Alert variant="destructive">
				<AlertDescription>
					Failed to load bot configuration. Please refresh the page.
				</AlertDescription>
			</Alert>
		)
	}

	if (isLoading || !initialValues) return <BotConfigFormSkeleton />

	return <BotConfigFormInner initialValues={initialValues} />
}
