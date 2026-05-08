import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { getFeatures } from "@/data/landing"
import { FeatureCard } from "./FeatureCard"

export function FeaturesSection() {
	const { t } = useTranslation()
	const features = useMemo(() => getFeatures(t), [t])

	return (
		<section className="bg-muted py-24">
			<div className="container mx-auto px-6">
				<div className="grid gap-12 sm:grid-cols-3">
					{features.map((feature) => (
						<FeatureCard key={feature.id} feature={feature} />
					))}
				</div>
			</div>
		</section>
	)
}
