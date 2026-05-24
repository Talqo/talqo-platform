import { config } from "@/common/config"

export const trustedProxies = new Set(
	config.TRUSTED_PROXY_IPS?.split(",")
		.map((s) => s.trim())
		.filter(Boolean) ?? [],
)

export function isPrivateIp(ip: string): boolean {
	if (!ip) return false
	if (ip.startsWith("10.")) return true
	if (ip.startsWith("172.")) {
		const second = Number(ip.split(".")[1])
		return second >= 16 && second <= 31
	}
	if (ip.startsWith("192.168.")) return true
	if (ip.startsWith("127.")) return true
	if (ip === "::1") return true
	if (ip.toLowerCase().startsWith("fc") || ip.toLowerCase().startsWith("fd"))
		return true
	if (/^fe[89ab]/i.test(ip)) return true
	return false
}
