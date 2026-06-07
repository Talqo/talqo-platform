import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useForgotPassword } from "@/api/hooks/useAuth"
import {
	AuthCard,
	AuthHeader,
	ForgotPasswordForm,
	ForgotPasswordSuccess,
} from "@/components/auth"

export const Route = createFileRoute("/forgot-password")({
	component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
	const [submittedEmail, setSubmittedEmail] = useState("")
	const [isSubmitted, setIsSubmitted] = useState(false)
	const forgotPassword = useForgotPassword()

	const handleSubmit = (email: string) => {
		setSubmittedEmail(email)
		forgotPassword.mutate({ email }, { onSuccess: () => setIsSubmitted(true) })
	}

	return (
		<AuthCard>
			<div className="w-full max-w-sm">
				<AuthHeader />
				{isSubmitted ? (
					<ForgotPasswordSuccess email={submittedEmail} />
				) : (
					<ForgotPasswordForm
						onSubmit={handleSubmit}
						isPending={forgotPassword.isPending}
						error={forgotPassword.error}
					/>
				)}
			</div>
		</AuthCard>
	)
}
