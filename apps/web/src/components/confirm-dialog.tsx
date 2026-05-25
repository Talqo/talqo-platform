import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"

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
		<Dialog open={open} onOpenChange={onOpenChange}>
			{trigger}
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>
				{children}
				{error && (
					<Alert variant="destructive" className="mt-4">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
				<DialogFooter>
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
						disabled={disabled || confirmLoading}
						type="button"
					>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
