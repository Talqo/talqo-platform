interface ToolIconProps {
	color: "blue" | "green" | "purple" | "red" | "yellow";
	icon: string;
	size?: "sm" | "md";
}

const colorClasses: Record<
	ToolIconProps["color"],
	{ bg: string; text: string }
> = {
	blue: {
		bg: "bg-blue-100 dark:bg-blue-900/30",
		text: "text-blue-600 dark:text-blue-400",
	},
	green: {
		bg: "bg-green-100 dark:bg-green-900/30",
		text: "text-green-600 dark:text-green-400",
	},
	purple: {
		bg: "bg-purple-100 dark:bg-purple-900/30",
		text: "text-purple-600 dark:text-purple-400",
	},
	red: {
		bg: "bg-red-100 dark:bg-red-900/30",
		text: "text-red-600 dark:text-red-400",
	},
	yellow: {
		bg: "bg-yellow-100 dark:bg-yellow-900/30",
		text: "text-yellow-600 dark:text-yellow-400",
	},
};

const sizeClasses = {
	sm: "h-8 w-8 rounded-md",
	md: "h-10 w-10 rounded-lg",
};

export function ToolIcon({ color, icon, size = "sm" }: ToolIconProps) {
	const { bg, text } = colorClasses[color] ?? colorClasses.blue;

	return (
		<div
			className={`flex ${sizeClasses[size]} items-center justify-center ${bg}`}
		>
			<span className={`font-medium text-sm ${text}`}>{icon}</span>
		</div>
	);
}
