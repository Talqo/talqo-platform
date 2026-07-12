import { db } from "@/db"
import { filesService } from "@/modules/files/index"
import { ProviderConfigRepository } from "@/modules/provider-config/provider-config.repository"
import { DrizzleRagRepository } from "./rag.repository"
import { RagService } from "./rag.service"

const ragRepository = new DrizzleRagRepository(db)
// Own instance to avoid depending on provider-config's internal wiring
const providerConfigRepository = new ProviderConfigRepository(db)
export const ragService = new RagService(
	ragRepository,
	filesService,
	providerConfigRepository,
)
