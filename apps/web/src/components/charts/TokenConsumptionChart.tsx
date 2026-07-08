import { BarChart3 } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import type { ChartDataPoint } from "./types"

type TokenConsumptionChartProps = {
	data: ChartDataPoint[]
}

export function TokenConsumptionChart({ data }: TokenConsumptionChartProps) {
	const { t } = useTranslation()
	const hasData = data.length > 0

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("charts.tokenConsumption.title")}</CardTitle>
				<CardDescription>
					{t("charts.tokenConsumption.description")}
				</CardDescription>
			</CardHeader>
			<CardContent className="min-h-[250px]">
				{hasData ? (
					<ResponsiveContainer width="100%" height={250}>
						<BarChart
							data={data}
							role="img"
							aria-label={t("charts.tokenConsumption.ariaLabel")}
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
									border: "1px solid var(--border)",
									backgroundColor: "var(--popover)",
									color: "var(--popover-foreground)",
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
					<output className="flex h-[250px] flex-col items-center justify-center gap-2 text-muted-foreground">
						<BarChart3 size={48} className="opacity-50" />
						<p>{t("common.noData")}</p>
					</output>
				)}
			</CardContent>
		</Card>
	)
}
