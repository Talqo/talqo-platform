import { jwtVerify, SignJWT } from "jose"
import { config } from "./config"
import { UnauthorizedError } from "./errors"
import type { Logger } from "./logger"
import type { WideEvent } from "./wide-event.types"

export type TokenRole = "client" | "admin"

export type AppVariables = {
	adminId: string
	clientId: string
	logger: Logger
	requestId: string
	wideEvent: WideEvent
	auditActionLabel?: string
}

export type TokenPayload = {
	sub: string
	role: TokenRole
	/** Marks an impersonation token issued by admin */
	imp?: boolean
	/** Client's tokenVersion at sign time — invalidated when it changes (e.g. password reset) */
	tokenVersion?: number
}

let cachedSecret: Uint8Array | undefined

function getSecret(): Uint8Array {
	cachedSecret ??= new TextEncoder().encode(config.JWT_SECRET)
	return cachedSecret
}

export async function signToken(
	payload: TokenPayload,
	expiresIn = config.JWT_EXPIRES_IN,
): Promise<string> {
	return new SignJWT({
		role: payload.role,
		imp: payload.imp,
		tokenVersion: payload.tokenVersion,
	})
		.setProtectedHeader({ alg: "HS256" })
		.setSubject(payload.sub)
		.setIssuedAt()
		.setExpirationTime(expiresIn)
		.sign(getSecret())
}

const TOKEN_ROLES: ReadonlySet<string> = new Set<TokenRole>(["client", "admin"])

export async function verifyToken(token: string): Promise<TokenPayload> {
	try {
		const { payload } = await jwtVerify(token, getSecret())
		const sub = payload.sub
		const role = payload.role
		const imp = payload.imp
		const tokenVersion = payload.tokenVersion
		if (typeof sub !== "string" || !sub) {
			throw new UnauthorizedError("Invalid token: missing sub")
		}
		if (typeof role !== "string" || !TOKEN_ROLES.has(role)) {
			throw new UnauthorizedError("Invalid token: unknown role")
		}
		return {
			sub,
			role: role as TokenRole,
			imp: imp === true ? true : undefined,
			tokenVersion: typeof tokenVersion === "number" ? tokenVersion : undefined,
		}
	} catch (err) {
		if (err instanceof UnauthorizedError) throw err
		throw new UnauthorizedError("Invalid or expired token")
	}
}
