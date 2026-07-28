import { createFileRoute } from "@tanstack/react-router";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "./-page-header";
import { useWidgetStats, type WidgetStats } from "./-widget-stats-query";
import { useActiveWidget } from "./-widgets-query";

export const Route = createFileRoute("/dashboard/analytics")({
	component: AnalyticsPage,
});

const compactNumber = new Intl.NumberFormat("en", { notation: "compact" });

const metrics = [
	{ key: "conversations", label: "Conversations", color: "var(--chart-1)" },
	{ key: "messages", label: "Messages", color: "var(--chart-2)" },
	{ key: "tokens", label: "Tokens", color: "var(--chart-3)" },
] as const;

function formatHistoryDate(date: string) {
	return new Date(`${date}T00:00:00Z`).toLocaleDateString("en", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
}

function MetricChart({
	history,
	metric,
}: {
	history: WidgetStats["history"];
	metric: (typeof metrics)[number];
}) {
	return (
		<ResponsiveContainer width="100%" height={280}>
			<AreaChart data={history} margin={{ top: 8, right: 8, left: 8 }}>
				<CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
				<XAxis
					dataKey="date"
					tickFormatter={formatHistoryDate}
					tick={{ fontSize: 12 }}
					stroke="var(--muted-foreground)"
					tickLine={false}
					axisLine={false}
				/>
				<YAxis
					tickFormatter={(value: number) => compactNumber.format(value)}
					tick={{ fontSize: 12 }}
					stroke="var(--muted-foreground)"
					tickLine={false}
					axisLine={false}
					width={48}
				/>
				<Tooltip
					labelFormatter={(label) => formatHistoryDate(String(label))}
					contentStyle={{
						background: "var(--popover)",
						border: "1px solid var(--border)",
						borderRadius: "var(--radius)",
						color: "var(--popover-foreground)",
						fontSize: 12,
					}}
				/>
				<Area
					type="monotone"
					dataKey={metric.key}
					name={metric.label}
					stroke={metric.color}
					fill={metric.color}
					fillOpacity={0.15}
					strokeWidth={2}
				/>
			</AreaChart>
		</ResponsiveContainer>
	);
}

function AnalyticsPage() {
	const { widgets, isLoading, activeId, setSelectedId } = useActiveWidget();
	const { data: stats, isLoading: statsLoading } = useWidgetStats(activeId);

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<PageHeader
				title="Analytics"
				description="Conversation and usage statistics per widget."
				actions={
					<Select
						value={activeId}
						onValueChange={setSelectedId}
						disabled={isLoading || !widgets?.length}
					>
						<SelectTrigger className="w-48" aria-label="Select a widget">
							<SelectValue placeholder="Select a widget" />
						</SelectTrigger>
						<SelectContent>
							{(widgets ?? []).map((widget) => (
								<SelectItem key={widget.id} value={widget.id}>
									{widget.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				}
			/>

			{isLoading ? (
				<p className="text-muted-foreground">Loading widgets…</p>
			) : !widgets?.length ? (
				<p className="text-muted-foreground">
					No widgets yet. Create a bot on the Bots page to see statistics.
				</p>
			) : statsLoading || !stats ? (
				<p className="text-muted-foreground">Loading statistics…</p>
			) : (
				<>
					<div className="grid gap-4 sm:grid-cols-3">
						{metrics.map((metric) => (
							<Card key={metric.key}>
								<CardHeader>
									<CardDescription>{metric.label} (30 days)</CardDescription>
									<CardTitle className="text-2xl">
										{compactNumber.format(stats[metric.key])}
									</CardTitle>
								</CardHeader>
							</Card>
						))}
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Usage over time</CardTitle>
							<CardDescription>
								Daily totals for the last 30 days.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Tabs defaultValue="conversations">
								<TabsList>
									{metrics.map((metric) => (
										<TabsTrigger key={metric.key} value={metric.key}>
											{metric.label}
										</TabsTrigger>
									))}
								</TabsList>
								{metrics.map((metric) => (
									<TabsContent key={metric.key} value={metric.key}>
										<MetricChart history={stats.history} metric={metric} />
									</TabsContent>
								))}
							</Tabs>
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}
