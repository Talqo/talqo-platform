import type { Page } from "@playwright/test"

import { fillAndSubmitLogin } from "./auth"

/**
 * Log in as admin via the shared /login page.
 * Uses the unified login helper (client then admin fallback).
 */
export async function fillAndSubmitAdminLogin(
	page: Page,
	email: string,
	password: string,
) {
	await fillAndSubmitLogin(page, email, password)
}

/**
 * Navigate to the Backoffice page after logging in as admin.
 */
export async function navigateToBackoffice(page: Page) {
	await page.goto("/backoffice")
}
