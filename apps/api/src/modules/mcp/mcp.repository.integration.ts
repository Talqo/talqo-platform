import { afterAll, describe, expect, it } from "bun:test"
import { withSql } from "@/common/test-utils"
import { db } from "@/db"
import { McpRepository } from "./mcp.repository"

describe("McpRepository.enablePreMade — deleted-server race", () => {
	const createdClientIds: string[] = []
	const createdServerIds: string[] = []

	afterAll(async () => {
		await withSql(async (sql) => {
			if (createdClientIds.length > 0) {
				await sql`DELETE FROM clients WHERE id = ANY(${createdClientIds})`
			}
			if (createdServerIds.length > 0) {
				await sql`DELETE FROM pre_made_mcp_servers WHERE id = ANY(${createdServerIds})`
			}
		})
	})

	it("does not create a ghost row when the server is deleted before the insert (FK already blocks it) and surfaces NotFoundError instead of a raw FK error", async () => {
		const repo = new McpRepository(db)

		const [client] = await withSql(
			(sql) =>
				sql`INSERT INTO clients (name, email, password_hash) VALUES (${`FK Race Test ${crypto.randomUUID()}`}, ${`fk-race-${crypto.randomUUID()}@example.com`}, 'x') RETURNING id`,
		)
		const clientId = (client as { id: string }).id
		createdClientIds.push(clientId)

		const [server] = await withSql(
			(sql) =>
				sql`INSERT INTO pre_made_mcp_servers (name, mcp_config) VALUES (${`FK Race Test Server ${crypto.randomUUID()}`}, ${sql.json({ type: "http", url: "https://example.com" })}) RETURNING id`,
		)
		const serverId = (server as { id: string }).id
		createdServerIds.push(serverId)

		// Simulate the race: the server is deleted after the caller's existence
		// check but before enablePreMade's insert runs.
		await withSql(
			(sql) => sql`DELETE FROM pre_made_mcp_servers WHERE id = ${serverId}`,
		)
		createdServerIds.pop()

		await expect(repo.enablePreMade(clientId, serverId)).rejects.toMatchObject({
			statusCode: 404,
		})

		const rows = await withSql(
			(sql) =>
				sql`SELECT 1 FROM client_pre_made_mcp WHERE client_id = ${clientId} AND pre_made_mcp_id = ${serverId}`,
		)
		expect(rows.length).toBe(0)
	})
})
