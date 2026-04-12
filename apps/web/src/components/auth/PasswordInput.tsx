import { Eye, EyeOff, Lock } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PasswordInputProps {
	id: string
	label: string
	value: string
	onChange: (value: string) => void
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
	placeholder = "Enter password",
	autoComplete = "new-password",
	disabled = false,
	helpText,
}: PasswordInputProps) {
	const [showPassword, setShowPassword] = useState(false)

	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<div className="relative">
				<Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					id={id}
					type={showPassword ? "text" : "password"}
					placeholder={placeholder}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="pr-10 pl-10"
					autoComplete={autoComplete}
					disabled={disabled}
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
					onClick={() => setShowPassword(!showPassword)}
					aria-label={showPassword ? "Hide password" : "Show password"}
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
