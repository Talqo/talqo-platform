import { Bot, CreditCard, DollarSign, MessageSquare, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const iconMap = {
	dollar: DollarSign,
	zap: Zap,
	message: MessageSquare,
	bot: Bot,
	card: CreditCard,
};

interface StatCardProps {
	title: string;
	value: string;
	subtitle: string;
	icon: keyof typeof iconMap;
}

export function StatCard({ title, value, subtitle, icon }: StatCardProps) {
	const Icon = iconMap[icon];

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="font-medium text-sm">{title}</CardTitle>
				<Icon size={16} className="text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div className="font-bold text-2xl">{value}</div>
				<p className="text-muted-foreground text-xs">{subtitle}</p>
			</CardContent>
		</Card>
	);
}
