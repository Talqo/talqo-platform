import { createFileRoute } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
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
	const { data: logs, isLoading, error } = useAdminActivityLogs({ limit: 100 })

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-bold text-3xl tracking-tight">Activity Logs</h1>
				<p className="text-muted-foreground">
					Impersonate, suspend, and re-enable actions performed by admins
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Recent Actions</CardTitle>
					<CardDescription>
						Showing the 100 most recent admin actions
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex h-40 items-center justify-center">
							<Loader2 className="h-6 w-6 animate-spin text-primary" />
						</div>
					) : error ? (
						<p className="py-8 text-center text-destructive text-sm">
							Failed to load activity logs.
						</p>
					) : (
						<ActivityLogsTable logs={logs ?? []} />
					)}
				</CardContent>
			</Card>
		</div>
	)
}
