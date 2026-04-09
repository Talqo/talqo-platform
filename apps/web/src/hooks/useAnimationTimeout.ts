import { useCallback, useEffect, useRef } from "react";

export function useAnimationTimeout() {
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const setAnimationTimeout = useCallback(
		(callback: () => void, delay: number) => {
			// Clear any existing timeout
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
			timeoutRef.current = setTimeout(callback, delay);
		},
		[],
	);

	const clearAnimationTimeout = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	return {
		setAnimationTimeout,
		clearAnimationTimeout,
	};
}
