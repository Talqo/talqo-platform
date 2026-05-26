import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export type ConfirmDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description?: string
	confirmLabel: string
	cancelLabel?: string
	variant?: "default" | "destructive"
	onConfirm: () => void
	confirmLoading?: boolean
	disabled?: boolean
	error?: string | null
	trigger?: ReactNode
	children?: ReactNode
}

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel,
	cancelLabel,
	variant = "default",
	onConfirm,
	confirmLoading = false,
	disabled = false,
	error = null,
	trigger,
	children,
}: ConfirmDialogProps) {
	const { t } = useTranslation()
	const resolvedCancelLabel = cancelLabel ?? t("common.cancel")

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			{trigger}
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					{description && (
						<AlertDialogDescription>{description}</AlertDialogDescription>
					)}
				</AlertDialogHeader>
				{children}
				{error && (
					<Alert variant="destructive" className="mt-4">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
				<AlertDialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={confirmLoading}
						type="button"
					>
						{resolvedCancelLabel}
					</Button>
					<Button
						variant={variant}
						onClick={onConfirm}
						disabled={disabled === true || confirmLoading}
						type="button"
					>
						{confirmLabel}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
