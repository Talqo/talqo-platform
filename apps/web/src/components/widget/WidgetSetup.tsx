import { AlertCircle } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useCurrentUser } from "@/api/hooks"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { WidgetColors, WidgetColorsConfig, WidgetIcons } from "./setup"
import {
	AppearanceCard,
	BotNameCard,
	defaultColors,
	defaultIcons,
	EmbedCodeCard,
	WidgetPreview,
} from "./setup"

const DEFAULT_BOT_NAME = "AI Assistant"

export function WidgetSetup() {
	const { t } = useTranslation()
	const { data: client, isLoading, error } = useCurrentUser()
	const [colors, setColors] = useState<WidgetColorsConfig>(defaultColors)
	const [icons, setIcons] = useState<WidgetIcons>(defaultIcons)
	const [botName, setBotName] = useState<string>(DEFAULT_BOT_NAME)
	const [position, setPosition] = useState<"left" | "right">("right")

	const updateLightColor = (key: keyof WidgetColors, value: string) => {
		setColors((prev) => ({ ...prev, light: { ...prev.light, [key]: value } }))
	}

	const updateDarkColor = (key: keyof WidgetColors, value: string) => {
		setColors((prev) => ({ ...prev, dark: { ...prev.dark, [key]: value } }))
	}

	const updateIcon = (key: keyof WidgetIcons, value: string) => {
		setIcons((prev) => ({ ...prev, [key]: value }))
	}

	return (
		<div className="relative">
			{/* Configuration Panel */}
			<div className="space-y-6 lg:mr-[29rem]">
				{error && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertTitle>{t("widget.setup.errorTitle")}</AlertTitle>
						<AlertDescription>
							{error.message || t("widget.setup.errorDescription")}
						</AlertDescription>
					</Alert>
				)}
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
					position={position}
					colors={colors}
					icons={icons}
					botName={botName}
					isLoading={isLoading}
				/>
			</div>

			{/* Preview Panel - Fixed position to follow scroll */}
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
