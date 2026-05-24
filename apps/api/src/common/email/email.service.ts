import { Resend } from "resend"
import { config } from "@/common/config"
import { logger } from "@/common/logger"
import {
	passwordResetEmailTemplate,
	quotaAlertEmailTemplate,
	verificationEmailTemplate,
} from "./templates"

const FROM = "PagePal <noreply@salonek.org>"

// RFC 5322-ish email check — not exhaustive, but catches obvious garbage
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function assertEmail(to: string): void {
	if (!to || !EMAIL_RE.test(to)) {
		throw new Error(`Invalid email address: "${to}"`)
	}
}

function assertToken(token: string): void {
	if (!token || typeof token !== "string") {
		throw new Error("Token must be a non-empty string")
	}
}

function createClient(): Resend {
	return new Resend(config.RESEND_API_KEY)
}

async function send(to: string, subject: string, html: string): Promise<void> {
	logger.info("Sending email", { subject })
	const resend = createClient()
	const result = await resend.emails.send({ from: FROM, to, subject, html })
	if (result.error) {
		logger.error("Failed to send email", {
			subject,
			error: result.error.message,
		})
		throw new Error("Failed to send email")
	}
	logger.info("Email sent successfully", { subject, id: result.data?.id })
}

export async function sendVerificationEmail(
	to: string,
	token: string,
): Promise<void> {
	assertEmail(to)
	assertToken(token)
	const { subject, html } = verificationEmailTemplate(token)
	await send(to, subject, html)
}

export async function sendPasswordResetEmail(
	to: string,
	token: string,
): Promise<void> {
	assertEmail(to)
	assertToken(token)
	const { subject, html } = passwordResetEmailTemplate(token)
	await send(to, subject, html)
}

export async function sendQuotaAlertEmail(
	to: string,
	usagePercent: number,
): Promise<void> {
	assertEmail(to)
	if (
		!Number.isFinite(usagePercent) ||
		usagePercent < 0 ||
		usagePercent > 100
	) {
		throw new Error(
			`usagePercent must be a finite number between 0 and 100, got: ${usagePercent}`,
		)
	}
	const { subject, html } = quotaAlertEmailTemplate(usagePercent)
	await send(to, subject, html)
}
