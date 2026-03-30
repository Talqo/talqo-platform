import BotIconSvg from "../assets/bot-icon.svg?react";
import ClearIconSvg from "../assets/clear-icon.svg?react";
import CloseIconSvg from "../assets/close-icon.svg?react";
import ExpandIconSvg from "../assets/expand-icon.svg?react";
import MinimizeIconSvg from "../assets/minimize-icon.svg?react";
import MoonIconSvg from "../assets/moon-icon.svg?react";
import SendIconSvg from "../assets/send-icon.svg?react";
import SunIconSvg from "../assets/sun-icon.svg?react";
import XLargeIconSvg from "../assets/x-large-icon.svg?react";

interface IconProps {
	size?: number;
	className?: string;
}

export function SendIcon({ size = 16, className = "" }: IconProps) {
	return (
		<SendIconSvg
			width={size}
			height={size}
			className={className}
			aria-hidden="true"
		/>
	);
}

export function BotIcon({ size = 28, className = "" }: IconProps) {
	return (
		<BotIconSvg
			width={size}
			height={size}
			className={className}
			aria-hidden="true"
		/>
	);
}

export function ClearIcon({ size = 16, className = "" }: IconProps) {
	return (
		<ClearIconSvg
			width={size}
			height={size}
			className={className}
			aria-hidden="true"
		/>
	);
}

export function ExpandIcon({ size = 16, className = "" }: IconProps) {
	return (
		<ExpandIconSvg
			width={size}
			height={size}
			className={className}
			aria-hidden="true"
		/>
	);
}

export function MinimizeIcon({ size = 16, className = "" }: IconProps) {
	return (
		<MinimizeIconSvg
			width={size}
			height={size}
			className={className}
			aria-hidden="true"
		/>
	);
}

export function SunIcon({ size = 16, className = "" }: IconProps) {
	return (
		<SunIconSvg
			width={size}
			height={size}
			className={className}
			aria-hidden="true"
		/>
	);
}

export function MoonIcon({ size = 16, className = "" }: IconProps) {
	return (
		<MoonIconSvg
			width={size}
			height={size}
			className={className}
			aria-hidden="true"
		/>
	);
}

export function CloseIcon({ size = 16, className = "" }: IconProps) {
	return (
		<CloseIconSvg
			width={size}
			height={size}
			className={className}
			aria-hidden="true"
		/>
	);
}

export function XLargeIcon({ size = 24, className = "" }: IconProps) {
	return (
		<XLargeIconSvg
			width={size}
			height={size}
			className={className}
			aria-hidden="true"
		/>
	);
}
