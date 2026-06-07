import { db } from "@/db"
import { filesService } from "@/modules/files/index"
import { providerConfigRepository } from "@/modules/provider-config/index"
import { DrizzleRagRepository } from "./rag.repository"
import { RagService } from "./rag.service"

const ragRepository = new DrizzleRagRepository(db)
export const ragService = new RagService(
	ragRepository,
	filesService,
	providerConfigRepository,
)
