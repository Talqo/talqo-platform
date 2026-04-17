import { useState } from "react"
import { useCurrentUser } from "@/api/hooks"
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
	const { data: client, isLoading } = useCurrentUser()
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
		<div className="grid gap-6 lg:grid-cols-2">
			{/* Configuration Panel */}
			<div className="space-y-6">
				<BotNameCard
					botName={botName}
					botAvatar={icons.botAvatar}
					onBotNameChange={setBotName}
					onBotAvatarChange={(value) => updateIcon("botAvatar", value)}
				/>

				<AppearanceCard
					colors={colors}
					icons={icons}
					position={position}
					onLightColorChange={updateLightColor}
					onDarkColorChange={updateDarkColor}
					onIconChange={updateIcon}
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
			<WidgetPreview
				colors={colors}
				icons={icons}
				botName={botName}
				position={position}
			/>
		</div>
	)
}
