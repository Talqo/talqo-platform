import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	mock,
} from "bun:test";

type SendPayload = { from: string; to: string; subject: string; html: string };
type SendResult = {
	data: { id: string } | null;
	error: { message: string; name: string } | null;
};

// Mock the resend module before any imports
const mockSend = mock(
	async (_payload: SendPayload): Promise<SendResult> => ({
		data: { id: "test-id" },
		error: null,
	}),
);

mock.module("resend", () => ({
	Resend: class MockResend {
		emails = { send: mockSend };
	},
}));

// Import the service after mocking
type EmailService = {
	sendVerificationEmail: (to: string, token: string) => Promise<void>;
	sendPasswordResetEmail: (to: string, token: string) => Promise<void>;
	sendQuotaAlertEmail: (to: string, percentage: number) => Promise<void>;
};

// Load the module dynamically after mock is set up
let emailService: EmailService;

describe("email.service", () => {
	beforeAll(async () => {
		// Ensure env vars are set before importing
		process.env.RESEND_API_KEY = "test-api-key";
		process.env.APP_URL = "http://localhost:5173";

		const mod = await import("./email.service");
		emailService = {
			sendVerificationEmail: mod.sendVerificationEmail,
			sendPasswordResetEmail: mod.sendPasswordResetEmail,
			sendQuotaAlertEmail: mod.sendQuotaAlertEmail,
		};
	});

	beforeEach(() => {
		process.env.RESEND_API_KEY = "test-api-key";
		process.env.APP_URL = "http://localhost:5173";
		mockSend.mockClear();
	});

	afterEach(() => {
		delete process.env.RESEND_API_KEY;
		delete process.env.APP_URL;
	});

	describe("sendVerificationEmail", () => {
		it("resolves without throwing", async () => {
			await expect(
				emailService.sendVerificationEmail("user@example.com", "token-abc"),
			).resolves.toBeUndefined();
		});

		it("calls resend with correct to address", async () => {
			await emailService.sendVerificationEmail("user@example.com", "token-abc");
			expect(mockSend).toHaveBeenCalledTimes(1);
			const call = mockSend.mock.calls[0] as unknown as [SendPayload];
			expect(call[0]).toMatchObject({ to: "user@example.com" });
		});

		it("includes the token in the email body", async () => {
			await emailService.sendVerificationEmail("user@example.com", "token-abc");
			const call = mockSend.mock.calls[0] as unknown as [SendPayload];
			expect(call[0].html).toContain("token-abc");
		});

		it("throws when RESEND_API_KEY is not set", async () => {
			delete process.env.RESEND_API_KEY;
			await expect(
				emailService.sendVerificationEmail("user@example.com", "token-abc"),
			).rejects.toThrow("RESEND_API_KEY environment variable is not set");
		});

		it("throws when resend returns an error", async () => {
			mockSend.mockImplementationOnce(async () => ({
				data: null,
				error: { message: "invalid api key", name: "validation_error" },
			}));
			await expect(
				emailService.sendVerificationEmail("user@example.com", "token-abc"),
			).rejects.toThrow("Failed to send email to user@example.com");
		});
	});

	describe("sendPasswordResetEmail", () => {
		it("resolves without throwing", async () => {
			await expect(
				emailService.sendPasswordResetEmail("user@example.com", "reset-token"),
			).resolves.toBeUndefined();
		});

		it("calls resend with correct to address", async () => {
			await emailService.sendPasswordResetEmail(
				"user@example.com",
				"reset-token",
			);
			expect(mockSend).toHaveBeenCalledTimes(1);
			const call = mockSend.mock.calls[0] as unknown as [SendPayload];
			expect(call[0]).toMatchObject({ to: "user@example.com" });
		});

		it("includes the token in the email body", async () => {
			await emailService.sendPasswordResetEmail(
				"user@example.com",
				"reset-token",
			);
			const call = mockSend.mock.calls[0] as unknown as [SendPayload];
			expect(call[0].html).toContain("reset-token");
		});

		it("throws when resend returns an error", async () => {
			mockSend.mockImplementationOnce(async () => ({
				data: null,
				error: { message: "rate limit exceeded", name: "rate_limit_exceeded" },
			}));
			await expect(
				emailService.sendPasswordResetEmail("user@example.com", "reset-token"),
			).rejects.toThrow("Failed to send email to user@example.com");
		});
	});

	describe("sendQuotaAlertEmail", () => {
		it("resolves without throwing", async () => {
			await expect(
				emailService.sendQuotaAlertEmail("user@example.com", 80),
			).resolves.toBeUndefined();
		});

		it("calls resend with correct to address", async () => {
			await emailService.sendQuotaAlertEmail("user@example.com", 80);
			expect(mockSend).toHaveBeenCalledTimes(1);
			const call = mockSend.mock.calls[0] as unknown as [SendPayload];
			expect(call[0]).toMatchObject({ to: "user@example.com" });
		});

		it("includes the usage percentage in the email body", async () => {
			await emailService.sendQuotaAlertEmail("user@example.com", 80);
			const call = mockSend.mock.calls[0] as unknown as [SendPayload];
			expect(call[0].html).toContain("80");
		});

		it("throws when resend returns an error", async () => {
			mockSend.mockImplementationOnce(async () => ({
				data: null,
				error: {
					message: "service unavailable",
					name: "internal_server_error",
				},
			}));
			await expect(
				emailService.sendQuotaAlertEmail("user@example.com", 80),
			).rejects.toThrow("Failed to send email to user@example.com");
		});
	});
});
