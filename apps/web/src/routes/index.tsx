import { createFileRoute } from "@tanstack/react-router"
import { lazy, Suspense } from "react"
import { HeroSection } from "@/components/landing/HeroSection"
import { LandingHeader } from "@/components/landing/LandingHeader"

const FeaturesSection = lazy(() =>
	import("@/components/landing/FeaturesSection").then((module) => ({
		default: module.FeaturesSection,
	})),
)

const LandingFooter = lazy(() =>
	import("@/components/landing/LandingFooter").then((module) => ({
		default: module.LandingFooter,
	})),
)

export const Route = createFileRoute("/")({
	component: LandingPage,
})

function LandingPage() {
	return (
		<div className="flex min-h-screen flex-col bg-background">
			<LandingHeader />

			<main className="flex-1">
				<HeroSection />
				<Suspense fallback={null}>
					<FeaturesSection />
				</Suspense>
			</main>

			<Suspense fallback={null}>
				<LandingFooter />
			</Suspense>
		</div>
	)
}
