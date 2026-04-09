import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

type SendPayload = { from: string; to: string; subject: string; html: string };
type SendResult = {
	data: { id: string } | null;
	error: { message: string; name: string } | null;
};

const mockSend = mock(
	async (_payload: SendPayload): Promise<SendResult> => ({
		data: { id: "test-id" },
		error: null,
	}),
);

mock.module("resend", () => ({
	Resend: class {
		emails = { send: mockSend };
	},
}));

const { sendPasswordResetEmail, sendQuotaAlertEmail, sendVerificationEmail } =
	await import("./email.service");

describe("email.service", () => {
	beforeEach(() => {
		process.env.RESEND_API_KEY = "test-api-key";
		process.env.APP_URL = "http://localhost:5173";
	});

	afterEach(() => {
		delete process.env.RESEND_API_KEY;
		delete process.env.APP_URL;
		mockSend.mockClear();
	});

	describe("sendVerificationEmail", () => {
		it("resolves without throwing", async () => {
			await expect(
				sendVerificationEmail("user@example.com", "token-abc"),
			).resolves.toBeUndefined();
		});

		it("calls resend with correct to address", async () => {
			await sendVerificationEmail("user@example.com", "token-abc");
			expect(mockSend).toHaveBeenCalledTimes(1);
			expect(
				(mockSend.mock.calls[0] as unknown as [SendPayload])[0],
			).toMatchObject({ to: "user@example.com" });
		});

		it("includes the token in the email body", async () => {
			await sendVerificationEmail("user@example.com", "token-abc");
			const { html } = (mockSend.mock.calls[0] as unknown as [SendPayload])[0];
			expect(html).toContain("token-abc");
		});

		it("throws when RESEND_API_KEY is not set", async () => {
			delete process.env.RESEND_API_KEY;
			await expect(
				sendVerificationEmail("user@example.com", "token-abc"),
			).rejects.toThrow("RESEND_API_KEY environment variable is not set");
		});

		it("throws when resend returns an error", async () => {
			mockSend.mockImplementationOnce(async () => ({
				data: null,
				error: { message: "invalid api key", name: "validation_error" },
			}));
			await expect(
				sendVerificationEmail("user@example.com", "token-abc"),
			).rejects.toThrow("Failed to send email to user@example.com");
		});
	});

	describe("sendPasswordResetEmail", () => {
		it("resolves without throwing", async () => {
			await expect(
				sendPasswordResetEmail("user@example.com", "reset-token"),
			).resolves.toBeUndefined();
		});

		it("calls resend with correct to address", async () => {
			await sendPasswordResetEmail("user@example.com", "reset-token");
			expect(mockSend).toHaveBeenCalledTimes(1);
			expect(
				(mockSend.mock.calls[0] as unknown as [SendPayload])[0],
			).toMatchObject({ to: "user@example.com" });
		});

		it("includes the token in the email body", async () => {
			await sendPasswordResetEmail("user@example.com", "reset-token");
			const { html } = (mockSend.mock.calls[0] as unknown as [SendPayload])[0];
			expect(html).toContain("reset-token");
		});

		it("throws when resend returns an error", async () => {
			mockSend.mockImplementationOnce(async () => ({
				data: null,
				error: { message: "rate limit exceeded", name: "rate_limit_exceeded" },
			}));
			await expect(
				sendPasswordResetEmail("user@example.com", "reset-token"),
			).rejects.toThrow("Failed to send email to user@example.com");
		});
	});

	describe("sendQuotaAlertEmail", () => {
		it("resolves without throwing", async () => {
			await expect(
				sendQuotaAlertEmail("user@example.com", 80),
			).resolves.toBeUndefined();
		});

		it("calls resend with correct to address", async () => {
			await sendQuotaAlertEmail("user@example.com", 80);
			expect(mockSend).toHaveBeenCalledTimes(1);
			expect(
				(mockSend.mock.calls[0] as unknown as [SendPayload])[0],
			).toMatchObject({ to: "user@example.com" });
		});

		it("includes the usage percentage in the email body", async () => {
			await sendQuotaAlertEmail("user@example.com", 80);
			const { html } = (mockSend.mock.calls[0] as unknown as [SendPayload])[0];
			expect(html).toContain("80");
		});

		it("throws when resend returns an error", async () => {
			mockSend.mockImplementationOnce(async () => ({
				data: null,
				error: {
					message: "service unavailable",
					name: "internal_server_error",
				},
			}));
			await expect(sendQuotaAlertEmail("user@example.com", 80)).rejects.toThrow(
				"Failed to send email to user@example.com",
			);
		});
	});
});
