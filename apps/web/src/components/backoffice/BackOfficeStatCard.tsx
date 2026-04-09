import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BackOfficeStatCardProps {
	title: string;
	value: string;
	subtitle: string;
	icon: LucideIcon;
	variant?: "default" | "success";
}

export function BackOfficeStatCard({
	title,
	value,
	subtitle,
	icon: Icon,
	variant = "default",
}: BackOfficeStatCardProps) {
	return (
		<Card className="overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="font-medium text-sm dark:text-zinc-100">
					{title}
				</CardTitle>
				<Icon size={16} className="text-zinc-500 dark:text-zinc-400" />
			</CardHeader>
			<CardContent>
				<div
					className={
						variant === "success"
							? "font-bold text-2xl text-green-600 dark:text-green-500"
							: "font-bold text-2xl dark:text-zinc-50"
					}
				>
					{value}
				</div>
				<p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
			</CardContent>
		</Card>
	);
}
