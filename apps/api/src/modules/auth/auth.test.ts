import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Hono } from "hono";

const mockSendVerificationEmail = mock(
	async (_to: string, _token: string) => {},
);

mock.module("../../common/email/email.service", () => ({
	sendVerificationEmail: mockSendVerificationEmail,
}));

const { createAuthRouter } = await import("./auth.routes");
const { InMemoryAuthRepository } = await import("./auth.repository");
const { AuthService } = await import("./auth.service");

function buildApp() {
	const repo = new InMemoryAuthRepository();
	const service = new AuthService(repo);
	return new Hono().route("/auth", createAuthRouter(service));
}

const validRegistration = {
	name: "Alice",
	email: "alice@example.com",
	password: "password123",
};

describe("POST /auth/register", () => {
	let app: Hono;

	beforeEach(() => {
		app = buildApp();
		mockSendVerificationEmail.mockClear();
	});

	it("returns 201 and sends verification email on success", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		);
		expect(res.status).toBe(201);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.success).toBe(true);
		expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
		expect(
			(mockSendVerificationEmail.mock.calls[0] as [string, string])[0],
		).toBe(validRegistration.email);
	});

	it("returns 201 when a verified account already exists for the email (prevents enumeration)", async () => {
		// Complete the full flow to create a CLIENT record
		let capturedToken = "";
		mockSendVerificationEmail.mockImplementationOnce(async (_to, token) => {
			capturedToken = token;
		});
		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		);
		await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${capturedToken}`),
		);

		// Second registration with same email
		const res = await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		);
		expect(res.status).toBe(201);
		expect(((await res.json()) as Record<string, unknown>).success).toBe(true);
	});

	it("returns 400 for invalid email", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Alice",
					email: "not-an-email",
					password: "password123",
				}),
			}),
		);
		expect(res.status).toBe(400);
	});

	it("returns 400 when password is too short", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Alice",
					email: "alice@example.com",
					password: "short",
				}),
			}),
		);
		expect(res.status).toBe(400);
	});

	it("returns 400 when name is missing", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "alice@example.com",
					password: "password123",
				}),
			}),
		);
		expect(res.status).toBe(400);
	});
});

describe("GET /auth/verify-email", () => {
	let app: Hono;

	beforeEach(() => {
		app = buildApp();
		mockSendVerificationEmail.mockClear();
	});

	it("returns 200 and creates the CLIENT account", async () => {
		let capturedToken = "";
		mockSendVerificationEmail.mockImplementationOnce(async (_to, token) => {
			capturedToken = token;
		});

		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		);

		const res = await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${capturedToken}`),
		);
		expect(res.status).toBe(200);
		expect(((await res.json()) as Record<string, unknown>).success).toBe(true);
	});

	it("returns 400 for an unknown token", async () => {
		const res = await app.fetch(
			new Request(
				`http://localhost/auth/verify-email?token=${crypto.randomUUID()}`,
			),
		);
		expect(res.status).toBe(400);
	});

	it("returns 400 when token is not a valid UUID", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/verify-email?token=not-a-uuid"),
		);
		expect(res.status).toBe(400);
	});

	it("returns 400 when the same token is used twice", async () => {
		let capturedToken = "";
		mockSendVerificationEmail.mockImplementationOnce(async (_to, token) => {
			capturedToken = token;
		});

		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		);

		await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${capturedToken}`),
		);
		const res = await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${capturedToken}`),
		);
		expect(res.status).toBe(400);
	});
});

describe("POST /auth/login", () => {
	let app: Hono;

	beforeEach(async () => {
		app = buildApp();
		process.env.JWT_SECRET = "test-secret";

		// Register and verify a client
		let capturedToken = "";
		mockSendVerificationEmail.mockImplementationOnce(async (_to, token) => {
			capturedToken = token;
		});

		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		);
		await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${capturedToken}`),
		);
		mockSendVerificationEmail.mockClear();
	});

	afterEach(() => {
		delete process.env.JWT_SECRET;
	});

	it("returns 200 with a JWT token on valid credentials", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: validRegistration.email,
					password: validRegistration.password,
				}),
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
			new Request("http://localhost/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: validRegistration.email,
					password: "wrongpassword",
				}),
			}),
		);
		expect(res.status).toBe(401);
	});

	it("returns 401 for unknown email", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "nobody@example.com",
					password: "password123",
				}),
			}),
		);
		expect(res.status).toBe(401);
	});

	it("returns 401 when email is registered but not yet verified", async () => {
		// Register but do NOT verify
		mockSendVerificationEmail.mockImplementationOnce(async () => {});
		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Bob",
					email: "bob@example.com",
					password: "password123",
				}),
			}),
		);

		// No CLIENT record exists yet — login should return 401 (invalid credentials)
		const res = await app.fetch(
			new Request("http://localhost/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "bob@example.com",
					password: "password123",
				}),
			}),
		);
		expect(res.status).toBe(401);
	});

	it("returns 400 for invalid request body", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "not-an-email" }),
			}),
		);
		expect(res.status).toBe(400);
	});
});
