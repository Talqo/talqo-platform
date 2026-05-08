import { Link } from "@tanstack/react-router"
import { AlertCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

export function ResetPasswordInvalid() {
	const { t } = useTranslation()

	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<AlertCircle className="h-12 w-12 text-destructive" />
				</div>
				<CardTitle className="text-2xl">
					{t("auth.resetPassword.invalidTitle")}
				</CardTitle>
				<CardDescription>
					{t("auth.resetPassword.invalidDescription")}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<Alert variant="destructive">
					<AlertDescription>
						{t("auth.resetPassword.requestNew")}
					</AlertDescription>
				</Alert>
				<Button asChild className="w-full">
					<Link to="/forgot-password">{t("requestNewLink")}</Link>
				</Button>
			</CardContent>
		</Card>
	)
}
