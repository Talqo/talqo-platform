import { createFileRoute } from "@tanstack/react-router"
import { lazy, Suspense } from "react"
import { HeroSection } from "@/components/landing/HeroSection"
import { LandingHeader } from "@/components/landing/LandingHeader"
import { LandingWidgetEmbed } from "@/components/landing/LandingWidgetEmbed"

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

function FeaturesSectionFallback() {
	return <div className="min-h-200 animate-pulse bg-muted" />
}

function LandingFooterFallback() {
	return <div className="h-20 animate-pulse bg-background" />
}

export const Route = createFileRoute("/")({
	component: LandingPage,
})

function LandingPage() {
	return (
		<div className="flex min-h-screen flex-col bg-background">
			<LandingHeader />

			<main className="flex-1">
				<HeroSection />
				<Suspense fallback={<FeaturesSectionFallback />}>
					<FeaturesSection />
				</Suspense>
			</main>

			<Suspense fallback={<LandingFooterFallback />}>
				<LandingFooter />
			</Suspense>
			<LandingWidgetEmbed />
		</div>
	)
}
