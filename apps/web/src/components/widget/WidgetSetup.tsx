import { AlertCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
	useCurrentUser,
	useUpdateWidgetConfig,
	useWidgetConfig,
} from "@/api/hooks"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import type { WidgetColors, WidgetColorsConfig, WidgetIcons } from "./setup"
import {
	AppearanceCard,
	BotNameCard,
	DEFAULT_BOT_NAME,
	defaultColors,
	defaultIcons,
	EmbedCodeCard,
	WidgetPreview,
} from "./setup"

type Feedback = { type: "success" | "error"; message: string }

export function WidgetSetup() {
	const { t } = useTranslation()
	const {
		data: client,
		isLoading: isClientLoading,
		error: clientError,
	} = useCurrentUser()
	const {
		data: widgetConfig,
		isLoading: isConfigLoading,
		error: configError,
	} = useWidgetConfig()
	const updateWidgetConfig = useUpdateWidgetConfig()

	const [colors, setColors] = useState<WidgetColorsConfig>(defaultColors)
	const [icons, setIcons] = useState<WidgetIcons>(defaultIcons)
	const [botName, setBotName] = useState<string>(DEFAULT_BOT_NAME)
	const [position, setPosition] = useState<"left" | "right">("right")
	const [feedback, setFeedback] = useState<Feedback | null>(null)
	const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const hasInitialized = useRef(false)

	const scheduleFeedbackClear = () => {
		if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
		feedbackTimerRef.current = setTimeout(() => setFeedback(null), 5000)
	}

	useEffect(() => {
		return () => {
			if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
		}
	}, [])

	useEffect(() => {
		if (!widgetConfig || hasInitialized.current) return
		hasInitialized.current = true
		setBotName(widgetConfig.botName)
		setPosition(widgetConfig.position)
		setColors({
			light: widgetConfig.lightColors,
			dark: widgetConfig.darkColors,
		})
		setIcons(widgetConfig.icons)
	}, [widgetConfig])

	const updateLightColor = (key: keyof WidgetColors, value: string) => {
		setColors((prev) => ({ ...prev, light: { ...prev.light, [key]: value } }))
	}

	const updateDarkColor = (key: keyof WidgetColors, value: string) => {
		setColors((prev) => ({ ...prev, dark: { ...prev.dark, [key]: value } }))
	}

	const updateIcon = (key: keyof WidgetIcons, value: string) => {
		setIcons((prev) => ({ ...prev, [key]: value }))
	}

	const handleSave = () => {
		updateWidgetConfig.mutate(
			{
				botName,
				position,
				lightColors: colors.light,
				darkColors: colors.dark,
				icons,
			},
			{
				onSuccess: () => {
					setFeedback({
						type: "success",
						message: "Widget configuration saved.",
					})
					scheduleFeedbackClear()
				},
				onError: (err) => {
					const message =
						err instanceof Error
							? err.message
							: "Failed to save configuration. Please try again."
					setFeedback({ type: "error", message })
					scheduleFeedbackClear()
				},
			},
		)
	}

	const handleReset = () => {
		setColors(defaultColors)
		setIcons(defaultIcons)
		setBotName(DEFAULT_BOT_NAME)
		setPosition("right")
	}

	const isLoading = isClientLoading || isConfigLoading
	const isSaving = updateWidgetConfig.isPending

	return (
		<div className="relative">
			<div className="space-y-6 lg:mr-[29rem]">
				{clientError && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertTitle>{t("widget.setup.errorTitle")}</AlertTitle>
						<AlertDescription>
							{clientError.message || t("widget.setup.errorDescription")}
						</AlertDescription>
					</Alert>
				)}
				{configError && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertTitle>{t("widget.setup.configErrorTitle")}</AlertTitle>
						<AlertDescription>
							{configError.message ?? t("widget.setup.configErrorDescription")}
						</AlertDescription>
					</Alert>
				)}

				<Card className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm">
					<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
						<div>
							<CardTitle className="text-lg">
								{t("widget.setup.title")}
							</CardTitle>
						</div>
						<div className="flex items-center gap-2">
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										type="button"
										variant="outline"
										disabled={isLoading || isSaving}
									>
										Reset
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Reset to defaults?</AlertDialogTitle>
										<AlertDialogDescription>
											This will discard all customizations and restore the
											default theme. This action cannot be undone.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											onClick={handleReset}
											className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
										>
											Reset
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
							<Button
								type="button"
								onClick={handleSave}
								disabled={isLoading || isSaving}
							>
								{isSaving ? (
									<>
										<Spinner size="sm" className="mr-2" />
										Saving...
									</>
								) : (
									"Save"
								)}
							</Button>
						</div>
					</CardHeader>
					{feedback && (
						<CardContent className="pt-0">
							<Alert
								variant={feedback.type === "error" ? "destructive" : "default"}
							>
								<AlertDescription>{feedback.message}</AlertDescription>
							</Alert>
						</CardContent>
					)}
				</Card>

				<BotNameCard
					botName={botName}
					botAvatar={icons.botAvatar}
					onBotNameChange={setBotName}
					onBotAvatarChange={(value) => updateIcon("botAvatar", value)}
				/>

				<AppearanceCard
					colors={colors}
					position={position}
					onLightColorChange={updateLightColor}
					onDarkColorChange={updateDarkColor}
					onPositionChange={setPosition}
				/>

				<EmbedCodeCard
					widgetToken={client?.widgetToken}
					isLoading={isLoading}
				/>
			</div>

			<div className="hidden lg:fixed lg:top-24 lg:right-8 lg:block lg:max-h-[calc(100vh-8rem)] lg:w-[28rem] lg:overflow-auto">
				<WidgetPreview
					colors={colors}
					icons={icons}
					botName={botName}
					position={position}
				/>
			</div>
		</div>
	)
}
