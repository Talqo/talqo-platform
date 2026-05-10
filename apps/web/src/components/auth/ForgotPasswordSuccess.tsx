import { Link } from "@tanstack/react-router"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

type ForgotPasswordSuccessProps = {
	email: string
}

export function ForgotPasswordSuccess({ email }: ForgotPasswordSuccessProps) {
	const { t } = useTranslation()

	return (
		<Card>
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<CheckCircle2 className="h-12 w-12 text-green-500" />
				</div>
				<CardTitle className="text-2xl">
					{t("auth.forgotPassword.successTitle")}
				</CardTitle>
				<CardDescription>
					{t("auth.forgotPassword.successDescription", { email })}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button asChild variant="outline" className="w-full">
					<Link to="/login">
						<ArrowLeft className="mr-2 h-4 w-4" />
						{t("auth.forgotPassword.backToLogin")}
					</Link>
				</Button>
			</CardContent>
		</Card>
	)
}
