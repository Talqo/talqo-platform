import { MessageSquare } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
	CartesianGrid,
	Line,
	LineChart,
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
import type { ChartDataPoint } from "@/data/charts"

type QuestionsAskedChartProps = {
	data: ChartDataPoint[]
}

export function QuestionsAskedChart({ data }: QuestionsAskedChartProps) {
	const { t } = useTranslation()
	const hasData = data.length > 0

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("charts.questionsAsked.title")}</CardTitle>
				<CardDescription>
					{t("charts.questionsAsked.description")}
				</CardDescription>
			</CardHeader>
			<CardContent className="min-h-[200px] flex-1">
				{hasData ? (
					<ResponsiveContainer width="100%" height="100%">
						<LineChart
							data={data}
							role="img"
							aria-label={t("charts.questionsAsked.ariaLabel")}
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
							/>
							<Tooltip
								cursor={{
									stroke: "#a1a1aa",
									strokeWidth: 1,
									strokeDasharray: "3 3",
								}}
								contentStyle={{
									borderRadius: "8px",
									border: "1px solid #e4e4e7",
								}}
							/>
							<Line
								type="monotone"
								dataKey="questions"
								stroke="var(--primary)"
								strokeWidth={2}
								activeDot={{ r: 8 }}
							/>
						</LineChart>
					</ResponsiveContainer>
				) : (
					<output className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
						<MessageSquare size={48} className="opacity-50" />
						<p>{t("common.noData")}</p>
					</output>
				)}
			</CardContent>
		</Card>
	)
}
