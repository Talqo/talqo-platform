import { Eye, EyeOff, Lock } from "lucide-react"
import type { FocusEvent } from "react"
import { useId, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type PasswordInputProps = {
	id?: string
	label?: string
	value: string
	onChange: (value: string) => void
	onBlur?: (e: FocusEvent<HTMLInputElement>) => void
	placeholder?: string
	autoComplete?: string
	disabled?: boolean
	helpText?: string
}

export function PasswordInput({
	id,
	label,
	value,
	onChange,
	onBlur,
	placeholder,
	autoComplete = "new-password",
	disabled = false,
	helpText,
}: PasswordInputProps) {
	const { t } = useTranslation()
	const [showPassword, setShowPassword] = useState(false)
	const generatedId = useId()
	const inputId = id ?? generatedId

	return (
		<div className="space-y-2">
			{label && <Label htmlFor={inputId}>{label}</Label>}
			<div className="relative">
				<Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					id={inputId}
					type={showPassword ? "text" : "password"}
					placeholder={placeholder}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onBlur={onBlur}
					className="pr-10 pl-10"
					autoComplete={autoComplete}
					disabled={disabled}
					aria-label={!label ? placeholder : undefined}
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
					onClick={() => setShowPassword(!showPassword)}
					aria-label={
						showPassword ? t("common.hidePassword") : t("common.showPassword")
					}
					aria-pressed={showPassword}
					disabled={disabled}
				>
					{showPassword ? (
						<EyeOff className="h-4 w-4" />
					) : (
						<Eye className="h-4 w-4" />
					)}
				</Button>
			</div>
			{helpText && <p className="text-muted-foreground text-xs">{helpText}</p>}
		</div>
	)
}
