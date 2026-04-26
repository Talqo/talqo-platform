import { Bot, CreditCard, DollarSign, MessageSquare, Zap } from "lucide-react"
import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const iconMap = {
	dollar: DollarSign,
	zap: Zap,
	message: MessageSquare,
	bot: Bot,
	card: CreditCard,
}

type StatCardProps = {
	title: string
	value: string
	subtitle: string
	icon: keyof typeof iconMap
	action?: ReactNode
}

export function StatCard({
	title,
	value,
	subtitle,
	icon,
	action,
}: StatCardProps) {
	const Icon = iconMap[icon]

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="font-medium text-sm">{title}</CardTitle>
				<Icon size={16} className="text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div className="flex items-center gap-2">
					<span className="font-bold text-2xl">{value}</span>
					{action}
				</div>
				<p className="text-muted-foreground text-xs">{subtitle}</p>
			</CardContent>
		</Card>
	)
}
