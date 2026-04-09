import { motion } from "motion/react";

interface ToolAnimationProps {
	icon: string;
	startX: number;
	startY: number;
	onComplete?: () => void;
}

export function ToolAnimation({
	icon,
	startX,
	startY,
	onComplete,
}: ToolAnimationProps) {
	return (
		<motion.div
			key="flying-tool"
			initial={{
				scale: 1,
				opacity: 1,
				x: 0,
				y: 0,
				left: `${startX}px`,
				top: `${startY}px`,
			}}
			animate={{
				scale: [1, 1.3, 0.7],
				opacity: [1, 0.9, 0],
				x: [0, -150, -300],
				y: [0, -100, -200],
			}}
			transition={{
				duration: 1,
				ease: "easeInOut",
			}}
			onAnimationComplete={onComplete}
			className="pointer-events-none fixed z-50"
		>
			<motion.div
				animate={{
					rotate: [0, 180, 360],
				}}
				transition={{
					duration: 0.6,
					ease: "linear",
					repeat: Infinity,
				}}
				className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-green-600 shadow-lg"
			>
				<span className="font-bold text-white text-xs">{icon}</span>
			</motion.div>
		</motion.div>
	);
}
