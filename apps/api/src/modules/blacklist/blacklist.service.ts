import { ConflictError, NotFoundError } from "../../common/errors"
import type { BlacklistRepository } from "./blacklist.repository"

export class BlacklistService {
	constructor(private readonly repo: BlacklistRepository) {}

	async listWords(clientId: string) {
		return this.repo.listByClientId(clientId)
	}

	async addWord(clientId: string, word: string) {
		const normalized = word.trim().toLowerCase()
		const existing = await this.repo.findByWord(clientId, normalized)
		if (existing) throw new ConflictError("Word already in blacklist")
		return this.repo.addWord(clientId, normalized)
	}

	async removeWord(clientId: string, wordId: string) {
		const deleted = await this.repo.deleteWord(wordId, clientId)
		if (!deleted) throw new NotFoundError("Word not found")
	}
}
