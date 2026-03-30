import type { Feature } from "@/data/landing";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
	feature: Feature;
}

const colorClasses: Record<Feature["color"], string> = {
	blue: "bg-blue-500 dark:bg-blue-600",
	green: "bg-green-500 dark:bg-green-600",
	purple: "bg-purple-500 dark:bg-purple-600",
};

export function FeatureCard({ feature }: FeatureCardProps) {
	const { icon: Icon, title, description, color } = feature;

	return (
		<div className="flex flex-col items-center text-center">
			<div
				className={cn(
					"mb-4 flex h-12 w-12 items-center justify-center rounded-lg text-white",
					colorClasses[color],
				)}
			>
				<Icon size={24} />
			</div>
			<h3 className="mb-2 font-semibold text-foreground text-xl">{title}</h3>
			<p className="text-muted-foreground">{description}</p>
		</div>
	);
}
