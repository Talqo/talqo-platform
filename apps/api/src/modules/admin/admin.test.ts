import { beforeEach, describe, expect, it, mock } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { AdminRepository } from "./admin.repository";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock jwt so tests don't require config / env vars
mock.module("../../common/jwt", () => ({
	signToken: async (payload: Record<string, unknown>, _expiresIn?: string) =>
		`mock-token.${JSON.stringify(payload)}`,
	verifyToken: async () => ({ sub: "test", role: "admin" }),
}));

// Dynamic imports after mocks are registered
const { AdminService } = await import("./admin.service");
const { createAdminAuthRouter, createAdminClientRouter } = await import(
	"./admin.routes"
);
const { errorHandler } = await import("../../common/middleware/error-handler");

// ─── In-memory repository ─────────────────────────────────────────────────────

type AdminUser = {
	id: string;
	email: string;
	passwordHash: string;
	createdAt: Date;
};

type ClientRecord = {
	id: string;
	name: string;
	email: string;
	balanceUsd: string;
	monthlyUsageLimit: string | null;
	usageAlertThresholdUsd: string | null;
	status: string;
	lastActive: Date | null;
	createdAt: Date;
};

class InMemoryAdminRepository
	implements
		Pick<
			AdminRepository,
			| "findAdminByEmail"
			| "findAdminById"
			| "listClients"
			| "getClientDetail"
			| "updateClientStatus"
		>
{
	private admins = new Map<string, AdminUser>();
	private clientsMap = new Map<string, ClientRecord>();

	async findAdminByEmail(email: string) {
		for (const admin of this.admins.values()) {
			if (admin.email === email) return admin;
		}
		return null;
	}

	async findAdminById(id: string) {
		return this.admins.get(id) ?? null;
	}

	async listClients(limit: number, offset: number) {
		return [...this.clientsMap.values()].slice(offset, offset + limit);
	}

	async getClientDetail(clientId: string) {
		const client = this.clientsMap.get(clientId);
		if (!client) return null;
		return {
			...client,
			totalTokens: 0,
			totalCostUsd: "0",
			totalConversations: 0,
		};
	}

	async updateClientStatus(clientId: string, status: string) {
		const client = this.clientsMap.get(clientId);
		if (!client) return null;
		const updated = { ...client, status };
		this.clientsMap.set(clientId, updated);
		return { id: clientId, status };
	}

	// Test helpers
	addAdmin(email: string, passwordHash: string): AdminUser {
		const admin: AdminUser = {
			id: crypto.randomUUID(),
			email,
			passwordHash,
			createdAt: new Date(),
		};
		this.admins.set(admin.id, admin);
		return admin;
	}

	addClient(overrides: Partial<ClientRecord> = {}): ClientRecord {
		const client: ClientRecord = {
			id: crypto.randomUUID(),
			name: "Test Client",
			email: "client@example.com",
			balanceUsd: "100.00",
			monthlyUsageLimit: null,
			usageAlertThresholdUsd: null,
			status: "active",
			lastActive: null,
			createdAt: new Date(),
			...overrides,
		};
		this.clientsMap.set(client.id, client);
		return client;
	}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "securepassword123";

async function setupRepo() {
	const repo = new InMemoryAdminRepository();
	const passwordHash = await Bun.password.hash(ADMIN_PASSWORD);
	repo.addAdmin(ADMIN_EMAIL, passwordHash);
	return repo;
}

function buildApp(repo: InMemoryAdminRepository) {
	const service = new AdminService(repo as unknown as AdminRepository);
	const app = new OpenAPIHono();
	app.onError(errorHandler);
	app.route("/admin/auth", createAdminAuthRouter(service));
	app.route("/admin/clients", createAdminClientRouter(service));
	return { app, service };
}

// ─── AdminService unit tests ──────────────────────────────────────────────────

describe("AdminService.login()", () => {
	let repo: InMemoryAdminRepository;

	beforeEach(async () => {
		repo = await setupRepo();
	});

	it("returns token and admin info on valid credentials", async () => {
		const service = new AdminService(repo as unknown as AdminRepository);
		const result = await service.login({
			email: ADMIN_EMAIL,
			password: ADMIN_PASSWORD,
		});
		expect(typeof result.token).toBe("string");
		expect(result.admin.email).toBe(ADMIN_EMAIL);
	});

	it("normalizes email (trim + lowercase)", async () => {
		const service = new AdminService(repo as unknown as AdminRepository);
		const result = await service.login({
			email: "  ADMIN@EXAMPLE.COM  ",
			password: ADMIN_PASSWORD,
		});
		expect(typeof result.token).toBe("string");
	});

	it("throws UnauthorizedError for wrong password", async () => {
		const service = new AdminService(repo as unknown as AdminRepository);
		await expect(
			service.login({ email: ADMIN_EMAIL, password: "wrongpass" }),
		).rejects.toThrow("Invalid email or password");
	});

	it("throws UnauthorizedError for unknown email", async () => {
		const service = new AdminService(repo as unknown as AdminRepository);
		await expect(
			service.login({ email: "nobody@example.com", password: ADMIN_PASSWORD }),
		).rejects.toThrow("Invalid email or password");
	});

	it("returns the same error for wrong password and unknown email (enumeration protection)", async () => {
		const service = new AdminService(repo as unknown as AdminRepository);
		let wrongPassErr: unknown;
		let unknownEmailErr: unknown;
		try {
			await service.login({ email: ADMIN_EMAIL, password: "wrong" });
		} catch (e) {
			wrongPassErr = e;
		}
		try {
			await service.login({
				email: "nobody@example.com",
				password: ADMIN_PASSWORD,
			});
		} catch (e) {
			unknownEmailErr = e;
		}
		expect((wrongPassErr as Error).message).toBe(
			(unknownEmailErr as Error).message,
		);
	});
});

describe("AdminService.getClient()", () => {
	let repo: InMemoryAdminRepository;

	beforeEach(async () => {
		repo = await setupRepo();
	});

	it("returns client detail when found", async () => {
		const client = repo.addClient();
		const service = new AdminService(repo as unknown as AdminRepository);
		const result = await service.getClient(client.id);
		expect(result.id).toBe(client.id);
		expect(result.totalTokens).toBe(0);
	});

	it("throws NotFoundError when client does not exist", async () => {
		const service = new AdminService(repo as unknown as AdminRepository);
		await expect(service.getClient(crypto.randomUUID())).rejects.toThrow(
			"Client not found",
		);
	});
});

describe("AdminService.updateClientStatus()", () => {
	let repo: InMemoryAdminRepository;

	beforeEach(async () => {
		repo = await setupRepo();
	});

	it("updates client status", async () => {
		const client = repo.addClient({ status: "active" });
		const service = new AdminService(repo as unknown as AdminRepository);
		const result = await service.updateClientStatus(client.id, "suspended");
		expect(result.status).toBe("suspended");
	});

	it("throws ValidationError for invalid status", async () => {
		const client = repo.addClient();
		const service = new AdminService(repo as unknown as AdminRepository);
		await expect(
			service.updateClientStatus(client.id, "banned"),
		).rejects.toThrow();
	});

	it("throws NotFoundError when client does not exist", async () => {
		const service = new AdminService(repo as unknown as AdminRepository);
		await expect(
			service.updateClientStatus(crypto.randomUUID(), "suspended"),
		).rejects.toThrow("Client not found");
	});
});

describe("AdminService.impersonate()", () => {
	let repo: InMemoryAdminRepository;

	beforeEach(async () => {
		repo = await setupRepo();
	});

	it("returns an impersonation token", async () => {
		const client = repo.addClient();
		const service = new AdminService(repo as unknown as AdminRepository);
		const result = await service.impersonate(client.id);
		expect(typeof result.token).toBe("string");
	});

	it("throws NotFoundError when client does not exist", async () => {
		const service = new AdminService(repo as unknown as AdminRepository);
		await expect(service.impersonate(crypto.randomUUID())).rejects.toThrow(
			"Client not found",
		);
	});
});

// ─── Route integration tests ──────────────────────────────────────────────────

describe("POST /admin/auth/login", () => {
	let app: OpenAPIHono;

	beforeEach(async () => {
		const repo = await setupRepo();
		({ app } = buildApp(repo));
	});

	it("returns 200 with token and admin info on valid credentials", async () => {
		const res = await app.fetch(
			new Request("http://localhost/admin/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
			}),
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			success: boolean;
			data: { token: string };
		};
		expect(body.success).toBe(true);
		expect(typeof body.data.token).toBe("string");
	});

	it("returns 401 for wrong password", async () => {
		const res = await app.fetch(
			new Request("http://localhost/admin/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: ADMIN_EMAIL, password: "wrongpass" }),
			}),
		);
		expect(res.status).toBe(401);
	});

	it("returns 401 for unknown email", async () => {
		const res = await app.fetch(
			new Request("http://localhost/admin/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "nobody@example.com",
					password: ADMIN_PASSWORD,
				}),
			}),
		);
		expect(res.status).toBe(401);
	});

	it("returns same error for wrong password and unknown email (enumeration protection)", async () => {
		const res1 = await app.fetch(
			new Request("http://localhost/admin/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: ADMIN_EMAIL, password: "wrong" }),
			}),
		);
		const res2 = await app.fetch(
			new Request("http://localhost/admin/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "nobody@example.com",
					password: ADMIN_PASSWORD,
				}),
			}),
		);
		const b1 = (await res1.json()) as { message: string };
		const b2 = (await res2.json()) as { message: string };
		expect(b1.message).toBe(b2.message);
	});

	it("returns 400 for invalid request body", async () => {
		const res = await app.fetch(
			new Request("http://localhost/admin/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "not-an-email" }),
			}),
		);
		expect(res.status).toBe(400);
	});
});

describe("GET /admin/clients", () => {
	let app: OpenAPIHono;
	let repo: InMemoryAdminRepository;

	beforeEach(async () => {
		repo = await setupRepo();
		({ app } = buildApp(repo));
	});

	it("returns 200 with a list of clients", async () => {
		repo.addClient({ name: "Client A" });
		repo.addClient({ name: "Client B", email: "b@example.com" });
		const res = await app.fetch(new Request("http://localhost/admin/clients"));
		expect(res.status).toBe(200);
		const body = (await res.json()) as { success: boolean; data: unknown[] };
		expect(body.success).toBe(true);
		expect(body.data.length).toBe(2);
	});
});

describe("PATCH /admin/clients/:clientId/status", () => {
	let app: OpenAPIHono;
	let repo: InMemoryAdminRepository;

	beforeEach(async () => {
		repo = await setupRepo();
		({ app } = buildApp(repo));
	});

	it("returns 200 and updates the client status", async () => {
		const client = repo.addClient({ status: "active" });
		const res = await app.fetch(
			new Request(`http://localhost/admin/clients/${client.id}/status`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: "suspended" }),
			}),
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { data: { status: string } };
		expect(body.data.status).toBe("suspended");
	});

	it("returns 404 when client does not exist", async () => {
		const res = await app.fetch(
			new Request(
				`http://localhost/admin/clients/${crypto.randomUUID()}/status`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ status: "suspended" }),
				},
			),
		);
		expect(res.status).toBe(404);
	});
});

describe("POST /admin/clients/:clientId/impersonate", () => {
	let app: OpenAPIHono;
	let repo: InMemoryAdminRepository;

	beforeEach(async () => {
		repo = await setupRepo();
		({ app } = buildApp(repo));
	});

	it("returns 200 with an impersonation token", async () => {
		const client = repo.addClient();
		const res = await app.fetch(
			new Request(`http://localhost/admin/clients/${client.id}/impersonate`, {
				method: "POST",
			}),
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { data: { token: string } };
		expect(typeof body.data.token).toBe("string");
	});

	it("returns 404 when client does not exist", async () => {
		const res = await app.fetch(
			new Request(
				`http://localhost/admin/clients/${crypto.randomUUID()}/impersonate`,
				{ method: "POST" },
			),
		);
		expect(res.status).toBe(404);
	});
});
