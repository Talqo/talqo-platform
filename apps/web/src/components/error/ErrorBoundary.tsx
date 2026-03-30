import { AlertCircle } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface Props {
	children: React.ReactNode;
	fallback?: React.ReactNode;
}

interface State {
	hasError: boolean;
	error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// Log to error reporting service
		console.error("Error caught by boundary:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div className="flex min-h-[400px] items-center justify-center p-4">
					<Card className="max-w-md">
						<CardHeader>
							<div className="flex items-center gap-2">
								<AlertCircle className="h-5 w-5 text-red-500" />
								<CardTitle>Something went wrong</CardTitle>
							</div>
							<CardDescription>
								An error occurred while rendering this component.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="mb-4 text-muted-foreground text-sm">
								An unexpected error occurred. Please try reloading the page.
							</p>
							<Button
								onClick={() => {
									this.setState({ hasError: false });
								}}
							>
								Try again
							</Button>
						</CardContent>
					</Card>
				</div>
			);
		}

		return this.props.children;
	}
}
