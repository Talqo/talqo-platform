import DOMPurify from "isomorphic-dompurify"

export function sanitizeSvg(svgContent: string): string | null {
	// Allow optional XML declaration, comments, and whitespace before <svg
	if (!/<svg[\s>]/i.test(svgContent)) {
		return null
	}

	const sanitized = DOMPurify.sanitize(svgContent, {
		USE_PROFILES: { svg: true },
	})

	// Strip width/height only from the root <svg> element so the SVG scales to its container
	return sanitized
		.replace(/(<svg\b[^>]*?)\s+width="[^"]*"/i, "$1")
		.replace(/(<svg\b[^>]*?)\s+height="[^"]*"/i, "$1")
}
