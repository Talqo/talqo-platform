import type { ReactNode } from "react"

interface AuthCardProps {
	children: ReactNode
	className?: string
}

export function AuthCard({ children, className }: AuthCardProps) {
	return (
		<div
			className={`flex min-h-screen items-center justify-center bg-background px-4 py-12 ${className ?? ""}`}
		>
			{children}
		</div>
	)
}
