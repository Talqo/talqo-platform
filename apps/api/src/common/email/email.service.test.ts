import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	mock,
} from "bun:test"

type SendPayload = { from: string; to: string; subject: string; html: string }
type SendResult = {
	data: { id: string } | null
	error: { message: string; name: string } | null
}

// Mock the resend module before any imports
const mockSend = mock(
	async (_payload: SendPayload): Promise<SendResult> => ({
		data: { id: "test-id" },
		error: null,
	}),
)

mock.module("resend", () => ({
	Resend: class MockResend {
		emails = { send: mockSend }
	},
}))

// Import the service after mocking
type EmailService = {
	sendVerificationEmail: (to: string, token: string) => Promise<void>
	sendPasswordResetEmail: (to: string, token: string) => Promise<void>
	sendQuotaAlertEmail: (to: string, percentage: number) => Promise<void>
}

// Load the module dynamically after mock is set up
let emailService: EmailService

describe("email.service", () => {
	beforeAll(async () => {
		// Ensure env vars are set before importing
		process.env.RESEND_API_KEY = "test-api-key"
		process.env.APP_URL = "http://localhost:5173"

		const mod = await import("./email.service")
		emailService = {
			sendVerificationEmail: mod.sendVerificationEmail,
			sendPasswordResetEmail: mod.sendPasswordResetEmail,
			sendQuotaAlertEmail: mod.sendQuotaAlertEmail,
		}
	})

	beforeEach(() => {
		mockSend.mockClear()
	})

	afterEach(() => {
		delete process.env.RESEND_API_KEY
		delete process.env.APP_URL
	})

	describe("sendVerificationEmail", () => {
		it("sends verification email with correct parameters", async () => {
			process.env.RESEND_API_KEY = "test-api-key"
			process.env.APP_URL = "http://localhost:5173"

			await emailService.sendVerificationEmail("test@example.com", "token123")

			expect(mockSend).toHaveBeenCalledTimes(1)
			const call = mockSend.mock.calls[0] as [SendPayload]
			expect(call[0].to).toBe("test@example.com")
			expect(call[0].subject).toBe("Verify your email address")
			expect(call[0].html).toContain("token123")
			expect(call[0].html).toContain("http://localhost:5173/verify-email")
		})

		it("throws error when RESEND_API_KEY is missing", async () => {
			delete process.env.RESEND_API_KEY
			process.env.APP_URL = "http://localhost:5173"

			await expect(
				emailService.sendVerificationEmail("test@example.com", "token123"),
			).rejects.toThrow("RESEND_API_KEY not configured")
		})

		it("throws error when APP_URL is missing", async () => {
			process.env.RESEND_API_KEY = "test-api-key"
			delete process.env.APP_URL

			await expect(
				emailService.sendVerificationEmail("test@example.com", "token123"),
			).rejects.toThrow("APP_URL not configured")
		})
	})

	describe("sendPasswordResetEmail", () => {
		it("sends password reset email with correct parameters", async () => {
			process.env.RESEND_API_KEY = "test-api-key"
			process.env.APP_URL = "http://localhost:5173"

			await emailService.sendPasswordResetEmail(
				"test@example.com",
				"reset-token",
			)

			expect(mockSend).toHaveBeenCalledTimes(1)
			const call = mockSend.mock.calls[0] as [SendPayload]
			expect(call[0].to).toBe("test@example.com")
			expect(call[0].subject).toBe("Reset your password")
			expect(call[0].html).toContain("reset-token")
			expect(call[0].html).toContain("http://localhost:5173/reset-password")
		})
	})

	describe("sendQuotaAlertEmail", () => {
		it("sends quota alert email with correct percentage", async () => {
			process.env.RESEND_API_KEY = "test-api-key"
			process.env.FROM_EMAIL = "alerts@example.com"

			await emailService.sendQuotaAlertEmail("test@example.com", 85)

			expect(mockSend).toHaveBeenCalledTimes(1)
			const call = mockSend.mock.calls[0] as [SendPayload]
			expect(call[0].to).toBe("test@example.com")
			expect(call[0].subject).toBe("Usage Quota Alert: 85%")
			expect(call[0].html).toContain("85%")
		})

		it("throws error when FROM_EMAIL is missing", async () => {
			process.env.RESEND_API_KEY = "test-api-key"
			delete process.env.FROM_EMAIL

			await expect(
				emailService.sendQuotaAlertEmail("test@example.com", 85),
			).rejects.toThrow("FROM_EMAIL not configured")
		})
	})
})
