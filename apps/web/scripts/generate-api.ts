#!/usr/bin/env bun
/**
 * Fetches the OpenAPI spec from the running API and generates TypeScript types.
 *
 * Usage:
 *   bun run generate-api              # fetches from http://localhost:3000
 *   API_URL=http://localhost:4000 bun run generate-api
 */

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const apiUrl = process.env.API_URL ?? "http://localhost:3000";
const specUrl = `${apiUrl}/openapi.json`;

const outDir = resolve(import.meta.dir, "../src/api/generated");
const specFile = resolve(outDir, "openapi.json");
const typesFile = resolve(outDir, "openapi.d.ts");

console.log(`Fetching OpenAPI spec from ${specUrl}...`);

const response = await fetch(specUrl);
if (!response.ok) {
	console.error(
		`Failed to fetch spec: ${response.status} ${response.statusText}`,
	);
	console.error(`Make sure the API is running at ${apiUrl}`);
	process.exit(1);
}

const spec = await response.json();
writeFileSync(specFile, JSON.stringify(spec, null, 2));
console.log(`Spec saved to ${specFile}`);

console.log("Generating TypeScript types...");
execSync(`bunx openapi-typescript ${specFile} -o ${typesFile}`, {
	stdio: "inherit",
});
console.log(`Types generated at ${typesFile}`);
