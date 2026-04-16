import { useState } from "react"
import { useCurrentUser } from "@/api/hooks"
import {
	AppearanceCard,
	defaultColors,
	EmbedCodeCard,
	WidgetPreview,
} from "./setup"

export function WidgetSetup() {
	const { data: client, isLoading } = useCurrentUser()
	const [colors, setColors] = useState(defaultColors)
	const [position, setPosition] = useState<"left" | "right">("right")

	const updateColor = (key: keyof typeof colors, value: string) => {
		setColors((prev) => ({ ...prev, [key]: value }))
	}

	return (
		<div className="grid gap-6 lg:grid-cols-2">
			{/* Configuration Panel */}
			<div className="space-y-6">
				<AppearanceCard
					colors={colors}
					position={position}
					onColorChange={updateColor}
					onPositionChange={setPosition}
				/>

				<EmbedCodeCard
					clientId={client?.data?.id}
					position={position}
					colors={colors}
					isLoading={isLoading}
				/>
			</div>

			{/* Preview Panel */}
			<WidgetPreview colors={colors} position={position} />
		</div>
	)
}
