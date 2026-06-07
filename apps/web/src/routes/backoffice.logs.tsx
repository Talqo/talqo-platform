import { createFileRoute } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useAdminActivityLogs } from "@/api/hooks/useAdmin"
import { ActivityLogsTable } from "@/components/backoffice/ActivityLogsTable"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

export const Route = createFileRoute("/backoffice/logs")({
	component: ActivityLogsPage,
})

function ActivityLogsPage() {
	const { t } = useTranslation()
	const { data: logs, isLoading, error } = useAdminActivityLogs({ limit: 100 })

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-bold text-3xl tracking-tight">
					{t("backoffice.activityLogs.title")}
				</h1>
				<p className="text-muted-foreground">
					{t("backoffice.activityLogs.subtitle")}
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{t("backoffice.activityLogs.recentActions")}</CardTitle>
					<CardDescription>
						{t("backoffice.activityLogs.showingRecent")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex h-40 items-center justify-center">
							<Loader2 className="h-6 w-6 animate-spin text-primary" />
						</div>
					) : error ? (
						<p className="py-8 text-center text-destructive text-sm">
							{t("backoffice.activityLogs.failedToLoad")}
						</p>
					) : (
						<ActivityLogsTable logs={logs ?? []} />
					)}
				</CardContent>
			</Card>
		</div>
	)
}
