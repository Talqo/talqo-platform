import DOMPurify from "isomorphic-dompurify"
import AvatarIconSvg from "@/assets/avatar.svg?react"

export const DEFAULT_BOT_AVATAR = "bot"

type AvatarIconProps = {
	size?: number
	className?: string
	/** SVG string for custom icon, or "bot" for default */
	iconSvg?: string
}

export function AvatarIcon({
	size = 24,
	className = "",
	iconSvg,
}: AvatarIconProps) {
	if (iconSvg && iconSvg !== DEFAULT_BOT_AVATAR) {
		const sanitizedSvg = DOMPurify.sanitize(iconSvg, {
			USE_PROFILES: { svg: true },
		})

		return (
			<span
				// biome-ignore lint/security/noDangerouslySetInnerHtml: SVG is sanitized with DOMPurify above
				dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
				className={className}
				style={{
					width: size,
					height: size,
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
				}}
				aria-hidden="true"
			/>
		)
	}

	return (
		<AvatarIconSvg
			width={size}
			height={size}
			className={className}
			aria-hidden="true"
		/>
	)
}
