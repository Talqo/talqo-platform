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
	if (action === "suspend") {
		return <Badge variant="destructive">Suspend</Badge>
	}
	if (action === "re-enable") {
		return (
			<Badge className="bg-green-600 text-white hover:bg-green-700">
				Re-enable
			</Badge>
		)
	}
	if (action === "impersonate") {
		return <Badge variant="secondary">Impersonate</Badge>
	}
	return <Badge variant="outline">{action}</Badge>
}

export function ActivityLogsTable({ logs }: ActivityLogsTableProps) {
	if (logs.length === 0) {
		return (
			<p className="py-8 text-center text-muted-foreground text-sm">
				No activity logs yet.
			</p>
		)
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Timestamp</TableHead>
					<TableHead>Admin</TableHead>
					<TableHead>Action</TableHead>
					<TableHead>Client</TableHead>
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
