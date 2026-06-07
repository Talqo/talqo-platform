import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"

type ActivityLog = {
	id: string
	adminEmail: string
	clientName: string | null
	clientEmail: string | null
	actionType: string
	createdAt: string
}

type ActivityLogsTableProps = {
	logs: ActivityLog[]
}

function ActionBadge({ action }: { action: string }) {
	const { t } = useTranslation()
	if (action === "suspend") {
		return (
			<Badge variant="destructive">
				{t("backoffice.activityLogs.suspend")}
			</Badge>
		)
	}
	if (action === "re-enable") {
		return (
			<Badge className="bg-green-600 text-white hover:bg-green-700">
				{t("backoffice.activityLogs.reEnable")}
			</Badge>
		)
	}
	if (action === "impersonate") {
		return (
			<Badge variant="secondary">
				{t("backoffice.activityLogs.impersonate")}
			</Badge>
		)
	}
	return <Badge variant="outline">{action}</Badge>
}

export function ActivityLogsTable({ logs }: ActivityLogsTableProps) {
	const { t } = useTranslation()
	if (logs.length === 0) {
		return (
			<p className="py-8 text-center text-muted-foreground text-sm">
				{t("backoffice.activityLogs.noLogs")}
			</p>
		)
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>{t("backoffice.activityLogs.timestamp")}</TableHead>
					<TableHead>{t("backoffice.activityLogs.admin")}</TableHead>
					<TableHead>{t("backoffice.activityLogs.action")}</TableHead>
					<TableHead>{t("backoffice.activityLogs.client")}</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{logs.map((log) => (
					<TableRow key={log.id}>
						<TableCell className="whitespace-nowrap text-muted-foreground text-sm">
							{new Date(log.createdAt).toLocaleString()}
						</TableCell>
						<TableCell className="text-sm">{log.adminEmail}</TableCell>
						<TableCell>
							<ActionBadge action={log.actionType} />
						</TableCell>
						<TableCell className="text-sm">
							{log.clientName ?? log.clientEmail ?? (
								<span className="text-muted-foreground">—</span>
							)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
