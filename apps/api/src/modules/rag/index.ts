import { logger } from "@/common/logger"
import { db } from "@/db"
import { filesService } from "@/modules/files/index"
import { ProviderConfigRepository } from "@/modules/provider-config/provider-config.repository"
import { DrizzleRagRepository } from "./rag.repository"
import { RagService } from "./rag.service"

const ragRepository = new DrizzleRagRepository(db)
setInterval(() => {
	void ragRepository.refundExpiredEmbeddingUsage().catch((error) => {
		logger.error("Failed to reconcile embedding reservations", { error })
	})
}, 60_000).unref()
// Own instance to avoid depending on provider-config's internal wiring
const providerConfigRepository = new ProviderConfigRepository(db)
export const ragService = new RagService(
	ragRepository,
	filesService,
	providerConfigRepository,
)
