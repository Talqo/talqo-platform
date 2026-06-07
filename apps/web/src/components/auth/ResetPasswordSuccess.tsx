import { Link } from "@tanstack/react-router"
import { CheckCircle2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

export function ResetPasswordSuccess() {
	const { t } = useTranslation()

	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<CheckCircle2 className="h-12 w-12 text-green-500" />
				</div>
				<CardTitle className="text-2xl">
					{t("auth.resetPassword.successTitle")}
				</CardTitle>
				<CardDescription>
					{t("auth.resetPassword.successDescription")}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button asChild className="w-full">
					<Link to="/login">{t("auth.login.goToLogin")}</Link>
				</Button>
			</CardContent>
		</Card>
	)
}
