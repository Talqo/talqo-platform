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
}

export type TokenPayload = {
	sub: string
	role: TokenRole
	/** Marks an impersonation token issued by admin */
	imp?: boolean
}

const secret = new TextEncoder().encode(config.JWT_SECRET)

export async function signToken(
	payload: TokenPayload,
	expiresIn = config.JWT_EXPIRES_IN,
): Promise<string> {
	return new SignJWT({ role: payload.role, imp: payload.imp })
		.setProtectedHeader({ alg: "HS256" })
		.setSubject(payload.sub)
		.setIssuedAt()
		.setExpirationTime(expiresIn)
		.sign(secret)
}

export async function verifyToken(token: string): Promise<TokenPayload> {
	try {
		const { payload } = await jwtVerify(token, secret)
		return {
			sub: payload.sub as string,
			role: payload.role as TokenRole,
			imp: payload.imp as boolean | undefined,
		}
	} catch {
		throw new UnauthorizedError("Invalid or expired token")
	}
}
