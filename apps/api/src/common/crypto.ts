import { config } from "./config"

const ALGORITHM = "AES-GCM"
const KEY_HEX = config.PROVIDER_KEY_SECRET

async function importKey(): Promise<CryptoKey> {
	const keyBytes = Buffer.from(KEY_HEX, "hex")
	return crypto.subtle.importKey("raw", keyBytes, { name: ALGORITHM }, false, [
		"encrypt",
		"decrypt",
	])
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a colon-delimited string: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
export async function encrypt(plaintext: string): Promise<string> {
	const key = await importKey()
	const iv = crypto.getRandomValues(new Uint8Array(12))
	const encoded = new TextEncoder().encode(plaintext)

	// SubtleCrypto AES-GCM appends the 16-byte auth tag to the ciphertext
	const ciphertextWithTag = await crypto.subtle.encrypt(
		{ name: ALGORITHM, iv },
		key,
		encoded,
	)

	const ciphertextWithTagBytes = new Uint8Array(ciphertextWithTag)
	const ciphertext = ciphertextWithTagBytes.slice(0, -16)
	const authTag = ciphertextWithTagBytes.slice(-16)

	return [
		Buffer.from(iv).toString("hex"),
		Buffer.from(authTag).toString("hex"),
		Buffer.from(ciphertext).toString("hex"),
	].join(":")
}

/**
 * Decrypts a string produced by `encrypt`.
 * Expects "<iv_hex>:<authTag_hex>:<ciphertext_hex>" format.
 */
export async function decrypt(stored: string): Promise<string> {
	const [ivHex, authTagHex, ciphertextHex] = stored.split(":")
	if (!ivHex || !authTagHex || !ciphertextHex) {
		throw new Error("Invalid encrypted value format")
	}

	const key = await importKey()
	const iv = Buffer.from(ivHex, "hex")
	const authTag = Buffer.from(authTagHex, "hex")
	const ciphertext = Buffer.from(ciphertextHex, "hex")

	// Reassemble ciphertext + auth tag as SubtleCrypto expects
	const ciphertextWithTag = new Uint8Array(ciphertext.length + authTag.length)
	ciphertextWithTag.set(ciphertext)
	ciphertextWithTag.set(authTag, ciphertext.length)

	const decrypted = await crypto.subtle.decrypt(
		{ name: ALGORITHM, iv },
		key,
		ciphertextWithTag,
	)

	return new TextDecoder().decode(decrypted)
}
