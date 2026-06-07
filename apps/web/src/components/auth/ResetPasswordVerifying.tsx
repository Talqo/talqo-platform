import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

export function ResetPasswordVerifying() {
	const { t } = useTranslation()

	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<Loader2 className="h-12 w-12 animate-spin text-primary" />
				</div>
				<CardTitle className="text-2xl">
					{t("auth.resetPassword.verifyingTitle")}
				</CardTitle>
				<CardDescription>
					{t("auth.resetPassword.verifyingDescription")}
				</CardDescription>
			</CardHeader>
		</Card>
	)
}
