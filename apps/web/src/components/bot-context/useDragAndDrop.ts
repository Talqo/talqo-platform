import { useCallback, useRef, useState } from "react"

interface UseDragAndDropOptions {
	onDrop: (files: File[]) => void
}

interface UseDragAndDropReturn {
	isDragging: boolean
	bindDragEvents: {
		onDragEnter: (event: React.DragEvent) => void
		onDragLeave: (event: React.DragEvent) => void
		onDragOver: (event: React.DragEvent) => void
		onDrop: (event: React.DragEvent) => void
	}
}

export function useDragAndDrop(
	options: UseDragAndDropOptions,
): UseDragAndDropReturn {
	const [isDragging, setIsDragging] = useState(false)
	const dragCounterRef = useRef(0)

	const handleDragEnter = useCallback((event: React.DragEvent) => {
		event.preventDefault()
		// Pokud netáhne soubory (např. táhne text), ignorujeme to
		if (!event.dataTransfer.types.includes("Files")) return

		dragCounterRef.current += 1
		if (dragCounterRef.current === 1) {
			setIsDragging(true)
		}
	}, [])

	const handleDragLeave = useCallback((event: React.DragEvent) => {
		event.preventDefault()
		dragCounterRef.current -= 1
		if (dragCounterRef.current <= 0) {
			dragCounterRef.current = 0
			setIsDragging(false)
		}
	}, [])

	const handleDragOver = useCallback((event: React.DragEvent) => {
		event.preventDefault()
		// Vynutí ikonku kopírování na kurzoru (zlepší UX)
		event.dataTransfer.dropEffect = "copy"
	}, [])

	const handleDrop = useCallback(
		(event: React.DragEvent) => {
			event.preventDefault()
			dragCounterRef.current = 0
			setIsDragging(false)

			// Převedeme FileList na File[]
			const files = Array.from(event.dataTransfer.files)
			options.onDrop(files)
		},
		[options],
	)

	return {
		isDragging,
		bindDragEvents: {
			onDragEnter: handleDragEnter,
			onDragLeave: handleDragLeave,
			onDragOver: handleDragOver,
			onDrop: handleDrop,
		},
	}
}
