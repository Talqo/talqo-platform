/**
 * Application constants
 * Centralized to avoid magic strings and improve maintainability
 */

// localStorage keys
export const STORAGE_KEYS = {
	// Theme
	THEME: "theme",

	// Chat messages
	CHAT_MESSAGES: "chatbot_messages",
	CHAT_RATING_SHOWN: "chatbot_rating_shown",
	CHAT_RATING_VALUE: "chatbot_rating_value",
} as const;

// Default values
export const DEFAULTS = {
	THEME: "light" as const,
	CHAT_INITIAL_MESSAGE: "Hi! How can I help you today?",
} as const;

// Animation durations (ms)
export const ANIMATION = {
	TOOL_ADD_DURATION: 1000,
	CHAT_TYPING_DELAY: 1500,
	TYPING_INDICATOR_DOT_DURATION: 600,
} as const;

// UI Constants
export const UI = {
	CHAT_MAX_MESSAGES_BEFORE_RATING: 3,
	CHAT_DEFAULT_EXPANDED_HEIGHT: "h-[500px] w-[350px]",
	CHAT_EXPANDED_HEIGHT: "h-[80vh] w-[90vw] md:w-[600px]",
} as const;
