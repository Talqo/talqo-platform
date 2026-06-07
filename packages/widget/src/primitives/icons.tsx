import type { FunctionComponent, SVGProps } from "react"
import ClearChatIconSvg from "@/assets/clear-chat.svg?react"
import CloseIconSvg from "@/assets/close.svg?react"
import DarkModeIconSvg from "@/assets/dark-mode.svg?react"
import LightModeIconSvg from "@/assets/light-mode.svg?react"
import SendIconSvg from "@/assets/send-icon.svg?react"

type IconProps = {
	size?: number
	className?: string
}

function createIcon(
	Svg: FunctionComponent<SVGProps<SVGSVGElement>>,
	defaultSize: number,
) {
	return ({ size = defaultSize, className = "" }: IconProps) => (
		<Svg width={size} height={size} className={className} aria-hidden="true" />
	)
}

export const SendIcon = createIcon(SendIconSvg, 16)
export const ClearChatIcon = createIcon(ClearChatIconSvg, 16)
export const LightModeIcon = createIcon(LightModeIconSvg, 16)
export const DarkModeIcon = createIcon(DarkModeIconSvg, 16)
export const CloseIcon = createIcon(CloseIconSvg, 24)
