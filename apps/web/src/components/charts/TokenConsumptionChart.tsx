import { BarChart3 } from "lucide-react";
import {
	Bar,
	BarChart,
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
import type { ChartDataPoint } from "@/data/charts";

interface TokenConsumptionChartProps {
	data: ChartDataPoint[];
}

export function TokenConsumptionChart({ data }: TokenConsumptionChartProps) {
	const hasData = data.length > 0;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Token Consumption</CardTitle>
				<CardDescription>
					Daily token usage over the last 7 days
				</CardDescription>
			</CardHeader>
			<CardContent className="h-[300px]">
				{hasData ? (
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={data}
							role="img"
							aria-label="Bar chart showing token consumption over the last 7 days"
						>
							<CartesianGrid
								strokeDasharray="3 3"
								vertical={false}
								stroke="#e4e4e7"
							/>
							<XAxis
								dataKey="name"
								stroke="#888888"
								fontSize={12}
								tickLine={false}
								axisLine={false}
							/>
							<YAxis
								stroke="#888888"
								fontSize={12}
								tickLine={false}
								axisLine={false}
								tickFormatter={(value) => `${value}`}
							/>
							<Tooltip
								cursor={{ fill: "transparent" }}
								contentStyle={{
									borderRadius: "8px",
									border: "1px solid #e4e4e7",
								}}
							/>
							<Bar
								dataKey="tokens"
								fill="var(--primary)"
								radius={[4, 4, 0, 0]}
							/>
						</BarChart>
					</ResponsiveContainer>
				) : (
					<output className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
						<BarChart3 size={48} className="opacity-50" />
						<p>No data available</p>
					</output>
				)}
			</CardContent>
		</Card>
	);
}
