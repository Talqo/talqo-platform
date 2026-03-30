import { cn } from "@/lib/utils";

/**
 * Skeleton loading component for showing placeholder content
 * while data is loading.
 *
 * Note: Array indices used in skeleton components are acceptable
 * as these are static placeholder elements that never change order.
 */

interface SkeletonProps {
	className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
	return (
		<div
			className={cn(
				"animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800",
				className,
			)}
		/>
	);
}

interface SkeletonTextProps {
	lines?: 1 | 2 | 3 | 4 | 5;
	className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
	return (
		<div className={cn("space-y-2", className)}>
			<Skeleton className="h-4 w-full" />
			{lines > 1 && <Skeleton className="h-4 w-full" />}
			{lines > 2 && <Skeleton className="h-4 w-full" />}
			{lines > 3 && <Skeleton className="h-4 w-full" />}
			{lines > 4 && <Skeleton className="h-4 w-2/3" />}
		</div>
	);
}

interface SkeletonCardProps {
	hasHeader?: boolean;
	hasFooter?: boolean;
}

export function SkeletonCard({
	hasHeader = true,
	hasFooter = false,
}: SkeletonCardProps) {
	return (
		<div className="rounded-lg border border-border p-6">
			{hasHeader && (
				<div className="mb-4 space-y-2">
					<Skeleton className="h-6 w-1/3" />
					<Skeleton className="h-4 w-1/2" />
				</div>
			)}
			<SkeletonText lines={4} />
			{hasFooter && <Skeleton className="mt-4 h-10 w-24" />}
		</div>
	);
}

interface SkeletonStatsProps {
	count?: 2 | 3 | 4 | 5;
}

export function SkeletonStats({ count = 5 }: SkeletonStatsProps) {
	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
			<SkeletonStatCard />
			{count > 1 && <SkeletonStatCard />}
			{count > 2 && <SkeletonStatCard />}
			{count > 3 && <SkeletonStatCard />}
			{count > 4 && <SkeletonStatCard />}
		</div>
	);
}

function SkeletonStatCard() {
	return (
		<div className="rounded-lg border border-border p-4">
			<div className="flex items-center gap-2">
				<Skeleton className="h-4 w-4" />
				<Skeleton className="h-4 w-20" />
			</div>
			<Skeleton className="mt-2 h-8 w-16" />
			<Skeleton className="mt-1 h-3 w-24" />
		</div>
	);
}
