import { useCallback, useEffect, useState } from "react"
import {
	COLORS,
	type ColorId,
	DEFAULT_COLOR,
	DEFAULT_CUSTOM_COLOR,
	DEFAULT_FONT,
	DEFAULT_RADIUS,
	FONTS,
	type FontId,
	RADII,
	type RadiusId,
} from "@/lib/appearance"
import { applyCustomPalette, clearCustomPalette, isValidHex } from "@/lib/color"
import { STORAGE_KEYS } from "@/lib/constants"

export type { ColorId, FontId, RadiusId }

type LegacyMotif = "forest" | "sunset" | "ocean" | "berry"

const LEGACY_MOTIF_MAP: Record<
	LegacyMotif,
	{ color: ColorId; font: FontId; radius: RadiusId }
> = {
	forest: { color: "green", font: "inter", radius: "slight" },
	sunset: { color: "orange", font: "source-sans", radius: "round" },
	ocean: { color: "blue", font: "manrope", radius: "slight" },
	berry: { color: "purple", font: "nunito", radius: "round" },
}

function migrateLegacyMotif(): {
	color: ColorId
	font: FontId
	radius: RadiusId
} | null {
	if (typeof window === "undefined") return null
	const legacy = localStorage.getItem(STORAGE_KEYS.MOTIF)
	if (!legacy || !(legacy in LEGACY_MOTIF_MAP)) return null
	const mapped = LEGACY_MOTIF_MAP[legacy as LegacyMotif]
	localStorage.setItem(STORAGE_KEYS.COLOR, mapped.color)
	localStorage.setItem(STORAGE_KEYS.FONT, mapped.font)
	localStorage.setItem(STORAGE_KEYS.RADIUS, mapped.radius)
	localStorage.removeItem(STORAGE_KEYS.MOTIF)
	return mapped
}

function readStoredColor(): ColorId {
	if (typeof window === "undefined") return DEFAULT_COLOR
	const stored = localStorage.getItem(STORAGE_KEYS.COLOR)
	const valid = COLORS.find((c) => c.id === stored)
	return valid ? valid.id : DEFAULT_COLOR
}

function readStoredFont(): FontId {
	if (typeof window === "undefined") return DEFAULT_FONT
	const stored = localStorage.getItem(STORAGE_KEYS.FONT)
	const valid = FONTS.find((f) => f.id === stored)
	return valid ? valid.id : DEFAULT_FONT
}

function readStoredRadius(): RadiusId {
	if (typeof window === "undefined") return DEFAULT_RADIUS
	const stored = localStorage.getItem(STORAGE_KEYS.RADIUS)
	const valid = RADII.find((r) => r.id === stored)
	return valid ? valid.id : DEFAULT_RADIUS
}

function readStoredCustomColor(): string {
	if (typeof window === "undefined") return DEFAULT_CUSTOM_COLOR
	const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_COLOR)
	return stored && isValidHex(stored) ? stored : DEFAULT_CUSTOM_COLOR
}

function applyAttributes(color: ColorId, font: FontId, radius: RadiusId) {
	if (typeof window === "undefined") return
	document.documentElement.setAttribute("data-color", color)
	document.documentElement.setAttribute("data-font", font)
	document.documentElement.setAttribute("data-radius", radius)
}

export function useAppearance() {
	const migrated = migrateLegacyMotif()
	const [color, setColorState] = useState<ColorId>(
		migrated?.color ?? readStoredColor(),
	)
	const [font, setFontState] = useState<FontId>(
		migrated?.font ?? readStoredFont(),
	)
	const [radius, setRadiusState] = useState<RadiusId>(
		migrated?.radius ?? readStoredRadius(),
	)
	const [customColor, setCustomColorState] = useState<string>(
		readStoredCustomColor(),
	)

	const applyColor = useCallback((id: ColorId, custom: string) => {
		if (typeof window === "undefined") return
		const root = document.documentElement
		if (id === "custom") {
			applyCustomPalette(root, custom)
		} else {
			clearCustomPalette(root)
		}
	}, [])

	const setColor = (id: ColorId) => {
		setColorState(id)
		localStorage.setItem(STORAGE_KEYS.COLOR, id)
		applyAttributes(id, font, radius)
		applyColor(id, customColor)
		dispatchAppearanceChange()
	}

	const setFont = (id: FontId) => {
		setFontState(id)
		localStorage.setItem(STORAGE_KEYS.FONT, id)
		applyAttributes(color, id, radius)
		dispatchAppearanceChange()
	}

	const setRadius = (id: RadiusId) => {
		setRadiusState(id)
		localStorage.setItem(STORAGE_KEYS.RADIUS, id)
		applyAttributes(color, font, id)
		dispatchAppearanceChange()
	}

	const setCustomColor = (value: string) => {
		const hex = value.startsWith("#") ? value : `#${value}`
		if (!isValidHex(hex)) return
		setCustomColorState(hex)
		localStorage.setItem(STORAGE_KEYS.CUSTOM_COLOR, hex)
		applyColor("custom", hex)
		dispatchAppearanceChange()
	}

	function dispatchAppearanceChange() {
		document.dispatchEvent(new CustomEvent("appearance-change"))
	}

	useEffect(() => {
		applyAttributes(color, font, radius)
		applyColor(color, customColor)
	}, [color, font, radius, customColor, applyColor])

	useEffect(() => {
		const handleStorage = (event: StorageEvent) => {
			if (event.key === STORAGE_KEYS.COLOR && event.newValue) {
				const valid = COLORS.find((c) => c.id === event.newValue)
				if (valid) setColorState(valid.id)
			}
			if (event.key === STORAGE_KEYS.FONT && event.newValue) {
				const valid = FONTS.find((f) => f.id === event.newValue)
				if (valid) setFontState(valid.id)
			}
			if (event.key === STORAGE_KEYS.RADIUS && event.newValue) {
				const valid = RADII.find((r) => r.id === event.newValue)
				if (valid) setRadiusState(valid.id)
			}
			if (event.key === STORAGE_KEYS.CUSTOM_COLOR && event.newValue) {
				if (isValidHex(event.newValue)) setCustomColorState(event.newValue)
			}
		}

		const handleAppearanceChange = () => {
			setColorState(readStoredColor())
			setFontState(readStoredFont())
			setRadiusState(readStoredRadius())
			setCustomColorState(readStoredCustomColor())
		}

		const observer = new MutationObserver(() => {
			applyColor(color, customColor)
		})

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		})

		window.addEventListener("storage", handleStorage)
		document.addEventListener("appearance-change", handleAppearanceChange)

		return () => {
			window.removeEventListener("storage", handleStorage)
			document.removeEventListener("appearance-change", handleAppearanceChange)
			observer.disconnect()
		}
	}, [color, customColor, applyColor])

	return {
		color,
		font,
		radius,
		customColor,
		setColor,
		setFont,
		setRadius,
		setCustomColor,
	}
}
