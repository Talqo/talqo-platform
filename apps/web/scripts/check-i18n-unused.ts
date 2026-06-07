#!/usr/bin/env bun

import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"

const webRoot = resolve(import.meta.dir, "..")
const translationFile = join(webRoot, "public/locales/en/translation.json")
const srcDir = join(webRoot, "src")

// Keys only reachable via template literals (e.g. t(`charts.dayNames.${day}`))
// get auto-detected from source, but add manual prefixes here if auto-detection
// misses any (e.g. keys built across multiple statements).
const DYNAMIC_PREFIX_ALLOWLIST: string[] = []

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
	const keys: string[] = []
	for (const [k, v] of Object.entries(obj)) {
		const full = prefix ? `${prefix}.${k}` : k
		if (typeof v === "object" && v !== null && !Array.isArray(v)) {
			keys.push(...flattenKeys(v as Record<string, unknown>, full))
		} else {
			keys.push(full)
		}
	}
	return keys
}

function collectSourceFiles(dir: string): string[] {
	const files: string[] = []
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry)
		if (statSync(full).isDirectory()) {
			files.push(...collectSourceFiles(full))
		} else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
			files.push(full)
		}
	}
	return files
}

const translation = JSON.parse(
	readFileSync(translationFile, "utf-8"),
) as Record<string, unknown>

const allKeys = flattenKeys(translation)
const sourceFiles = collectSourceFiles(srcDir)
const allSource = sourceFiles.map((f) => readFileSync(f, "utf-8")).join("\n")

// Auto-detect dynamic prefixes from template literal t() calls like t(`x.${y}`)
const templateLiteralRegex = /t\(`([^`$]*)\$\{/g
const detectedPrefixes: string[] = []
for (const match of allSource.matchAll(templateLiteralRegex)) {
	const prefix = match[1]
	if (prefix) detectedPrefixes.push(prefix)
}

const dynamicPrefixes = [...DYNAMIC_PREFIX_ALLOWLIST, ...detectedPrefixes]

const unusedKeys: string[] = []
for (const key of allKeys) {
	if (dynamicPrefixes.some((p) => key.startsWith(p))) continue
	const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	const keyUsageRegex = new RegExp(`["'\`]${escapedKey}["'\`]`)
	if (!keyUsageRegex.test(allSource)) unusedKeys.push(key)
}

if (unusedKeys.length === 0) {
	console.log("All translation keys are in use.")
	process.exit(0)
}

console.log(
	`Found ${unusedKeys.length} potentially unused translation key(s):\n`,
)
for (const key of unusedKeys) {
	console.log(`  ${key}`)
}
console.log(
	"\nNote: keys used only in template literals (e.g. t('prefix.<variable>'))",
)
console.log(
	"may appear as false positives. Add their prefix to DYNAMIC_PREFIX_ALLOWLIST.",
)
process.exit(1)
