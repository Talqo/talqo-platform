import * as Sentry from "@sentry/react"
import { AlertCircle } from "lucide-react"
import React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

function ErrorFallback() {
	const { t } = useTranslation()

	return (
		<div className="flex min-h-[400px] items-center justify-center p-4">
			<Card className="max-w-md">
				<CardHeader>
					<div className="flex items-center gap-2">
						<AlertCircle className="h-5 w-5 text-destructive" />
						<CardTitle>{t("error.errorBoundary.title")}</CardTitle>
					</div>
					<CardDescription>
						{t("error.errorBoundary.description")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="mb-4 text-muted-foreground text-sm">
						{t("error.errorBoundary.message")}
					</p>
					<Button onClick={() => window.location.reload()}>
						{t("error.errorBoundary.tryAgain")}
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}

type Props = {
	children: React.ReactNode
	fallback?: React.ReactNode
}

type State = {
	hasError: boolean
	error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		Sentry.captureException(error, {
			extra: { componentStack: errorInfo.componentStack },
		})
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback
			}

			return <ErrorFallback />
		}

		return this.props.children
	}
}
