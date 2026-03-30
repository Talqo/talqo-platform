import {
	FeaturesSection,
	HeroSection,
	LandingFooter,
	LandingHeader,
} from "@/components/landing";

export function LandingPage() {
	return (
		<div className="flex min-h-screen flex-col bg-background">
			<LandingHeader />

			<main className="flex-1">
				<HeroSection />
				<FeaturesSection />
			</main>

			<LandingFooter />
		</div>
	);
}
