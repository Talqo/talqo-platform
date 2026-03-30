interface PageHeaderProps {
	title: string;
	subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
	return (
		<div>
			<h1 className="font-bold text-2xl text-foreground tracking-tight">
				{title}
			</h1>
			{subtitle && <p className="text-muted-foreground">{subtitle}</p>}
		</div>
	);
}
