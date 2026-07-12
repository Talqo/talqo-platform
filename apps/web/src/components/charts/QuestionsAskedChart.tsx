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
import type { ChartDataPoint } from "./types"

type QuestionsAskedChartProps = {
	data: ChartDataPoint[]
	title?: string
	description?: string
	ariaLabel?: string
}

export function QuestionsAskedChart({
	data,
	title,
	description,
	ariaLabel,
}: QuestionsAskedChartProps) {
	const { t } = useTranslation()
	const hasData = data.length > 0

	return (
		<Card>
			<CardHeader>
				<CardTitle>{title ?? t("charts.questionsAsked.title")}</CardTitle>
				<CardDescription>
					{description ?? t("charts.questionsAsked.description")}
				</CardDescription>
			</CardHeader>
			<CardContent className="min-h-[250px]">
				{hasData ? (
					<ResponsiveContainer width="100%" height={250}>
						<LineChart
							data={data}
							role="img"
							aria-label={ariaLabel ?? t("charts.questionsAsked.ariaLabel")}
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
								allowDecimals={false}
								domain={[0, "auto"]}
							/>
							<Tooltip
								cursor={{
									stroke: "#a1a1aa",
									strokeWidth: 1,
									strokeDasharray: "3 3",
								}}
								contentStyle={{
									borderRadius: "8px",
									border: "1px solid var(--border)",
									backgroundColor: "var(--popover)",
									color: "var(--popover-foreground)",
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
					<output className="flex h-[250px] flex-col items-center justify-center gap-2 text-muted-foreground">
						<MessageSquare size={48} className="opacity-50" />
						<p>{t("common.noData")}</p>
					</output>
				)}
			</CardContent>
		</Card>
	)
}
