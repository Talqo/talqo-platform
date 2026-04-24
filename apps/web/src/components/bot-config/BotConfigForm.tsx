import { zodResolver } from "@hookform/resolvers/zod"
import { useCallback, useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
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
import { Switch } from "@/components/ui/switch"
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

	const form = useForm<BotConfigSchema>({
		resolver: zodResolver(botConfigSchema),
		defaultValues: initialValues,
		mode: "onBlur",
	})

	const onSubmit = async (values: BotConfigSchema) => {
		try {
			await updateBotConfig.mutateAsync({
				systemPrompt: toApi(values.systemPrompt),
				defaultRole: toApi(values.defaultRole),
				toneStyle: toApi(values.toneStyle),
				internetSearchEnabled: values.internetSearchEnabled,
			})
			setFeedback({ type: "success", message: "Configuration saved." })
			clearFeedback()
		} catch (err) {
			console.error("Failed to save bot config:", err)
			setFeedback({
				type: "error",
				message: "Failed to save. Please try again.",
			})
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Bot Personality & Behavior</CardTitle>
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
									<FormLabel>System Prompt</FormLabel>
									<FormControl>
										<Textarea
											className="min-h-40"
											placeholder="Define the behavior and context for your AI assistant..."
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Instructions that define how your AI assistant responds to
										users.
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
									<FormLabel>Default Role</FormLabel>
									<FormControl>
										<Input
											placeholder='e.g. "Customer support agent for Acme Shop"'
											{...field}
										/>
									</FormControl>
									<FormDescription>
										The role your bot assumes when responding to users.
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
									<FormLabel>Tone & Communication Style</FormLabel>
									<FormControl>
										<Input
											placeholder='e.g. "Professional but friendly"'
											{...field}
										/>
									</FormControl>
									<FormDescription>
										How the bot should sound in conversations with users.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="internetSearchEnabled"
							render={({ field }) => (
								<FormItem className="flex items-center justify-between gap-4 pt-2">
									<div>
										<FormLabel>Internet Search</FormLabel>
										<FormDescription>
											Allow the bot to search the internet for answers.
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
					</CardContent>
					<CardFooter className="flex justify-end">
						<Button type="submit" disabled={form.formState.isSubmitting}>
							{form.formState.isSubmitting ? "Saving..." : "Save Configuration"}
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
