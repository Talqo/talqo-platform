import { useEffect, useState } from "react"
import { STORAGE_KEYS } from "@/lib/constants"
import { DEFAULT_MOTIF, MOTIFS, type MotifId } from "@/lib/motifs"

export type { MotifId }

function readStoredMotif(): MotifId {
	if (typeof window === "undefined") return DEFAULT_MOTIF
	const stored = localStorage.getItem(STORAGE_KEYS.MOTIF)
	const valid = MOTIFS.find((m) => m.id === stored)
	return valid ? valid.id : DEFAULT_MOTIF
}

function applyMotif(id: MotifId) {
	if (typeof window === "undefined") return
	document.documentElement.setAttribute("data-motif", id)
}

export function useMotif() {
	const [motif, setMotifState] = useState<MotifId>(() => readStoredMotif())

	const setMotif = (id: MotifId) => {
		setMotifState(id)
		localStorage.setItem(STORAGE_KEYS.MOTIF, id)
		applyMotif(id)
		document.dispatchEvent(new CustomEvent("motif-change", { detail: id }))
	}

	useEffect(() => {
		applyMotif(motif)
	}, [motif])

	useEffect(() => {
		const handleStorage = (event: StorageEvent) => {
			if (event.key === STORAGE_KEYS.MOTIF && event.newValue) {
				const valid = MOTIFS.find((m) => m.id === event.newValue)
				if (valid) setMotifState(valid.id)
			}
		}

		const handleMotifChange = (event: Event) => {
			const custom = event as CustomEvent<MotifId>
			if (custom.detail) setMotifState(custom.detail)
		}

		window.addEventListener("storage", handleStorage)
		document.addEventListener("motif-change", handleMotifChange)

		return () => {
			window.removeEventListener("storage", handleStorage)
			document.removeEventListener("motif-change", handleMotifChange)
		}
	}, [])

	return { motif, setMotif }
}
