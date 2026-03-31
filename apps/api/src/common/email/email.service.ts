import { Resend } from "resend";
import {
	passwordResetEmailTemplate,
	quotaAlertEmailTemplate,
	verificationEmailTemplate,
} from "./templates";

const FROM = "onboarding@resend.dev";

// RFC 5322-ish email check — not exhaustive, but catches obvious garbage
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function assertEmail(to: string): void {
	if (!to || !EMAIL_RE.test(to)) {
		throw new Error(`Invalid email address: "${to}"`);
	}
}

function assertToken(token: string): void {
	if (!token || typeof token !== "string") {
		throw new Error("Token must be a non-empty string");
	}
}

function createClient(): Resend {
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		throw new Error("RESEND_API_KEY environment variable is not set");
	}
	return new Resend(apiKey);
}

async function send(to: string, subject: string, html: string): Promise<void> {
	const resend = createClient();
	const { error } = await resend.emails.send({ from: FROM, to, subject, html });
	if (error) {
		throw new Error(`Failed to send email to ${to}: ${error.message}`);
	}
}

export async function sendVerificationEmail(
	to: string,
	token: string,
): Promise<void> {
	assertEmail(to);
	assertToken(token);
	const { subject, html } = verificationEmailTemplate(token);
	await send(to, subject, html);
}

export async function sendPasswordResetEmail(
	to: string,
	token: string,
): Promise<void> {
	assertEmail(to);
	assertToken(token);
	const { subject, html } = passwordResetEmailTemplate(token);
	await send(to, subject, html);
}

export async function sendQuotaAlertEmail(
	to: string,
	usagePercent: number,
): Promise<void> {
	assertEmail(to);
	if (
		!Number.isFinite(usagePercent) ||
		usagePercent < 0 ||
		usagePercent > 100
	) {
		throw new Error(
			`usagePercent must be a finite number between 0 and 100, got: ${usagePercent}`,
		);
	}
	const { subject, html } = quotaAlertEmailTemplate(usagePercent);
	await send(to, subject, html);
}
