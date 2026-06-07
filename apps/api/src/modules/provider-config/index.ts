import { db } from "@/db"
import { ProviderConfigRepository } from "./provider-config.repository"
import { ProviderConfigService } from "./provider-config.service"

const providerConfigRepository = new ProviderConfigRepository(db)
export const providerConfigService = new ProviderConfigService(
	providerConfigRepository,
)

export { default as providerConfigRoutes } from "./provider-config.routes"
export { providerConfigRepository }
