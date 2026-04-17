import { AlertCircle } from "lucide-react"
import { useState } from "react"
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
		<div className="grid items-start gap-6 lg:grid-cols-2">
			{/* Configuration Panel */}
			<div className="space-y-6">
				{error && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertTitle>Error loading client data</AlertTitle>
						<AlertDescription>
							{error.message ||
								"Failed to load client information. Please try again."}
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
					clientId={client?.data?.id}
					position={position}
					colors={colors}
					icons={icons}
					botName={botName}
					isLoading={isLoading}
				/>
			</div>

			{/* Preview Panel */}
			<div className="lg:sticky lg:top-6 lg:h-fit">
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
