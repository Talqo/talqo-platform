import { FEATURES } from "@/data/landing";
import { FeatureCard } from "./FeatureCard";

export function FeaturesSection() {
	return (
		<section className="bg-muted py-24">
			<div className="container mx-auto px-6">
				<div className="grid gap-12 sm:grid-cols-3">
					{FEATURES.map((feature) => (
						<FeatureCard key={feature.id} feature={feature} />
					))}
				</div>
			</div>
		</section>
	);
}
