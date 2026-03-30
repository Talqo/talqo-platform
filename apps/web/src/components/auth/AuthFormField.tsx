import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthFormFieldProps {
	id: string;
	name: string;
	label: string;
	type?: string;
	placeholder?: string;
	value: string;
	onChange: (value: string) => void;
	onBlur: () => void;
	error?: string;
	showError?: boolean;
	errorId?: string;
	autoComplete?: string;
}

export function AuthFormField({
	id,
	name,
	label,
	type = "text",
	placeholder,
	value,
	onChange,
	onBlur,
	error,
	showError,
	errorId,
	autoComplete,
}: AuthFormFieldProps) {
	const hasError = Boolean(showError && error);

	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<Input
				id={id}
				name={name}
				type={type}
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onBlur={onBlur}
				autoComplete={autoComplete}
				aria-invalid={hasError}
				aria-describedby={hasError ? errorId : undefined}
				className={hasError ? "border-red-500 focus-visible:ring-red-500" : ""}
			/>
			{hasError && (
				<div
					id={errorId}
					className="flex items-center gap-1.5 text-red-600 text-sm dark:text-red-500"
					aria-live="polite"
				>
					<AlertCircle size={14} />
					<span>{error}</span>
				</div>
			)}
		</div>
	);
}
