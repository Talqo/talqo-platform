import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useResetPassword, useVerifyResetTokenQuery } from "@/api/hooks/useAuth"
import {
	AuthCard,
	ResetPasswordForm,
	ResetPasswordInvalid,
	ResetPasswordSuccess,
	ResetPasswordVerifying,
} from "@/components/auth"

export const Route = createFileRoute("/reset-password")({
	component: ResetPasswordPage,
	validateSearch: (search: Record<string, unknown>): { token?: string } => ({
		token: typeof search.token === "string" ? search.token : undefined,
	}),
})

type ResetState =
	| { status: "loading" }
	| { status: "invalid" }
	| { status: "ready" }
	| { status: "success" }
	| { status: "error"; message: string }

function ResetPasswordPage() {
	const { t } = useTranslation()
	const { token } = Route.useSearch()
	const navigate = useNavigate()
	const [state, setState] = useState<ResetState>({ status: "loading" })
	const processedRef = useRef(false)
	const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const {
		isLoading: isVerifying,
		isError: isVerifyError,
		error: verifyError,
	} = useVerifyResetTokenQuery(token)
	const resetPassword = useResetPassword()

	useEffect(() => {
		if (processedRef.current) return
		processedRef.current = true

		if (!token) {
			setState({ status: "invalid" })
			return
		}
	}, [token])

	useEffect(() => {
		if (isVerifying) {
			setState({ status: "loading" })
		} else if (isVerifyError) {
			const errorCode = verifyError?.error?.code
			const isTokenError =
				errorCode === "INVALID_TOKEN" ||
				errorCode === "TOKEN_EXPIRED" ||
				errorCode === "TOKEN_ALREADY_USED"

			if (isTokenError) {
				setState({ status: "invalid" })
			} else {
				setState({
					status: "error",
					message: t("auth.resetPassword.unableToVerify"),
				})
			}
		} else if (token && !isVerifying) {
			setState({ status: "ready" })
		}
	}, [isVerifying, isVerifyError, verifyError, token, t])

	useEffect(() => {
		return () => {
			if (redirectTimerRef.current) {
				clearTimeout(redirectTimerRef.current)
			}
		}
	}, [])

	const handleSubmit = (password: string) => {
		if (!token) return

		resetPassword.mutate(
			{ token, password },
			{
				onSuccess: () => {
					setState({ status: "success" })
					if (redirectTimerRef.current) {
						clearTimeout(redirectTimerRef.current)
					}
					redirectTimerRef.current = setTimeout(() => {
						navigate({ to: "/login" })
					}, 3000)
				},
				onError: (err) => {
					const code = err.error?.code || "UNKNOWN_ERROR"
					let message = t("auth.resetPassword.failed")

					if (code === "INVALID_TOKEN" || code === "TOKEN_EXPIRED") {
						message = t("auth.resetPassword.linkInvalidOrExpired")
					} else if (code === "TOKEN_ALREADY_USED") {
						message = t("auth.resetPassword.linkAlreadyUsed")
					}

					setState({ status: "error", message })
				},
			},
		)
	}

	const renderContent = () => {
		switch (state.status) {
			case "loading":
				return <ResetPasswordVerifying />
			case "invalid":
				return <ResetPasswordInvalid />
			case "success":
				return <ResetPasswordSuccess />
			case "ready":
			case "error":
				return (
					<ResetPasswordForm
						onSubmit={handleSubmit}
						isPending={resetPassword.isPending}
						error={state.status === "error" ? state.message : null}
					/>
				)
			default:
				return null
		}
	}

	return <AuthCard>{renderContent()}</AuthCard>
}
