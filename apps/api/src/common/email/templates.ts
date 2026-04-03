const baseStyle = `
  font-family: sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 32px 24px;
  color: #111827;
`;

const buttonStyle = `
  display: inline-block;
  padding: 12px 24px;
  background-color: #2563eb;
  color: #ffffff;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 600;
  margin: 24px 0;
`;

const footerStyle = `
  margin-top: 32px;
  font-size: 13px;
  color: #6b7280;
`;

function getAppUrl(): string {
	const url = process.env.APP_URL;
	if (!url) throw new Error("APP_URL environment variable is not set");
	return url.replace(/\/$/, "");
}

export function verificationEmailTemplate(token: string): {
	subject: string;
	html: string;
} {
	const verifyUrl = `${getAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;
	return {
		subject: "Verify your email address",
		html: `
      <div style="${baseStyle}">
        <h2>Verify your email address</h2>
        <p>Thanks for signing up. Click the button below to verify your email address.</p>
        <a href="${verifyUrl}" style="${buttonStyle}">Verify email</a>
        <p>Or copy this link: ${verifyUrl}</p>
        <p>This link expires in 24 hours.</p>
        <p style="${footerStyle}">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
	};
}

export function passwordResetEmailTemplate(token: string): {
	subject: string;
	html: string;
} {
	const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
	return {
		subject: "Reset your password",
		html: `
      <div style="${baseStyle}">
        <h2>Reset your password</h2>
        <p>We received a request to reset the password for your account.</p>
        <a href="${resetUrl}" style="${buttonStyle}">Reset password</a>
        <p>Or copy this link: ${resetUrl}</p>
        <p>This link expires in 1 hour.</p>
        <p style="${footerStyle}">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `,
	};
}

export function quotaAlertEmailTemplate(usagePercent: number): {
	subject: string;
	html: string;
} {
	return {
		subject: `You've used ${usagePercent}% of your quota`,
		html: `
      <div style="${baseStyle}">
        <h2>Quota usage alert</h2>
        <p>You have used <strong>${usagePercent}%</strong> of your monthly quota.</p>
        <p>To avoid service interruption, consider upgrading your plan.</p>
        <a href="${getAppUrl()}/dashboard/settings?tab=billing" style="${buttonStyle}">Manage billing</a>
        <p style="${footerStyle}">You are receiving this email because you enabled quota alerts in your account settings.</p>
      </div>
    `,
	};
}
