import { useMemo } from "react"
import type { ChartDataPoint } from "@/data/charts"
import { formatPeriod } from "@/lib/backoffice-utils"

type TokenData = { period: string; tokensUsed: number }[] | undefined
type ConversationData =
	| { period: string; conversationCount: number }[]
	| undefined

export function useBackofficeChartData(
	tokenData: TokenData,
	conversationData: ConversationData,
) {
	const tokenChartData: ChartDataPoint[] = useMemo(
		() =>
			(tokenData ?? []).map((d) => ({
				name: formatPeriod(d.period),
				tokens: d.tokensUsed,
				questions: 0,
			})),
		[tokenData],
	)

	const conversationChartData: ChartDataPoint[] = useMemo(
		() =>
			(conversationData ?? []).map((d) => ({
				name: formatPeriod(d.period),
				tokens: 0,
				questions: d.conversationCount,
			})),
		[conversationData],
	)

	return { tokenChartData, conversationChartData }
}
