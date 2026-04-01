import { and, eq } from "drizzle-orm";
import type { DB } from "../../db";
import { blacklistWords } from "../../db/schema";

export class BlacklistRepository {
	constructor(private readonly db: DB) {}

	async listByClientId(clientId: string) {
		return this.db
			.select()
			.from(blacklistWords)
			.where(eq(blacklistWords.clientId, clientId))
			.orderBy(blacklistWords.createdAt);
	}

	async findWord(wordId: string, clientId: string) {
		return this.db
			.select()
			.from(blacklistWords)
			.where(
				and(
					eq(blacklistWords.id, wordId),
					eq(blacklistWords.clientId, clientId),
				),
			)
			.then((rows) => rows[0] ?? null);
	}

	async findByWord(clientId: string, word: string) {
		return this.db
			.select()
			.from(blacklistWords)
			.where(
				and(
					eq(blacklistWords.clientId, clientId),
					eq(blacklistWords.word, word),
				),
			)
			.then((rows) => rows[0] ?? null);
	}

	async addWord(clientId: string, word: string) {
		const [row] = await this.db
			.insert(blacklistWords)
			.values({ clientId, word })
			.returning();
		return row;
	}

	async deleteWord(wordId: string, clientId: string) {
		const result = await this.db
			.delete(blacklistWords)
			.where(
				and(
					eq(blacklistWords.id, wordId),
					eq(blacklistWords.clientId, clientId),
				),
			)
			.returning();
		return result.length > 0;
	}
}
