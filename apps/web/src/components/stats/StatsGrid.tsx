import type { StatCardData, StatIcon } from "@/data/charts";
import { StatCard } from "./StatCard";

interface StatsGridProps {
	stats: StatCardData[];
}

export function StatsGrid({ stats }: StatsGridProps) {
	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
			{stats.map((stat) => (
				<StatCard
					key={stat.title}
					title={stat.title}
					value={stat.value}
					subtitle={stat.subtitle}
					icon={stat.icon as StatIcon}
				/>
			))}
		</div>
	);
}
