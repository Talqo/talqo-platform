#!/usr/bin/env bun
/**
 * Generates TypeScript types from the backend's OpenAPI spec.
 * Starts the API automatically if not already running.
 */

import { execSync, spawn } from "node:child_process"
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"

const apiUrl = process.env.API_URL ?? "http://localhost:3000"
const specUrl = `${apiUrl}/openapi.json`
const apiDir = resolve(import.meta.dir, "../../../api")

const outDir = resolve(import.meta.dir, "../src/api/generated")
const specFile = resolve(outDir, "openapi.json")
const typesFile = resolve(outDir, "openapi.d.ts")

async function waitForApi(url: string, timeoutMs = 30000): Promise<boolean> {
	const start = Date.now()
	while (Date.now() - start < timeoutMs) {
		try {
			const res = await fetch(url, { method: "HEAD" })
			if (res.ok) return true
		} catch {}
		await new Promise((r) => setTimeout(r, 500))
	}
	return false
}

// Check if API is already running
let apiProcess: ReturnType<typeof spawn> | null = null

try {
	const check = await fetch(specUrl)
	if (!check.ok) throw new Error("not running")
	console.log("API already running, using existing instance")
} catch {
	console.log("Starting API server...")
	apiProcess = spawn("bun", ["run", "dev"], {
		cwd: apiDir,
		stdio: "ignore",
		detached: true,
	})

	console.log("Waiting for API to be ready...")
	const ready = await waitForApi(specUrl)
	if (!ready) {
		console.error("API failed to start within timeout")
		process.exit(1)
	}
	console.log("API is ready")
}

// Fetch spec and generate types
console.log(`Fetching OpenAPI spec from ${specUrl}...`)
const response = await fetch(specUrl)
if (!response.ok) {
	console.error(
		`Failed to fetch spec: ${response.status} ${response.statusText}`,
	)
	process.exit(1)
}

const spec = await response.json()
writeFileSync(specFile, JSON.stringify(spec, null, 2))
console.log(`Spec saved to ${specFile}`)

console.log("Generating TypeScript types...")
execSync(`bunx openapi-typescript ${specFile} -o ${typesFile}`, {
	stdio: "inherit",
})
console.log(`Types generated at ${typesFile}`)

// Cleanup: kill the API we started
if (apiProcess?.pid) {
	console.log("Stopping API server...")
	process.kill(-apiProcess.pid)
}
