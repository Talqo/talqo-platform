import type { InputHTMLAttributes, RefObject } from "react";
import { useWidgetContext } from "./WidgetRoot";

interface WidgetInputProps extends InputHTMLAttributes<HTMLInputElement> {
	/** Ref to the input element */
	inputRef?: RefObject<HTMLInputElement | null>;
}

/**
 * Input field for typing messages
 * Unstyled - consumers provide all styling
 */
export function WidgetInput(props: WidgetInputProps) {
	const { inputRef, onKeyDown, ...inputProps } = props;
	const { inputValue, setInputValue, sendMessage } = useWidgetContext();

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (inputValue.trim()) {
				sendMessage();
			}
		}
		onKeyDown?.(e);
	};

	return (
		<input
			ref={inputRef}
			type="text"
			value={inputValue}
			onChange={(e) => setInputValue(e.target.value)}
			onKeyDown={handleKeyDown}
			aria-label="Type your message"
			{...inputProps}
		/>
	);
}
