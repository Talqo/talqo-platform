export const translations = {
	en: {
		greeting: "Hi there! How can I help you today?",
		placeholder: "Type a message...",
		send: "Send",
		openChat: "Open chat",
		closeChat: "Close chat",
		close: "Close",
		messageLabel: "Message",
	},
	cs: {
		greeting: "Dobrý den! Jak vám mohu dnes pomoci?",
		placeholder: "Napište zprávu...",
		send: "Odeslat",
		openChat: "Otevřít chat",
		closeChat: "Zavřít chat",
		close: "Zavřít",
		messageLabel: "Zpráva",
	},
	zh: {
		greeting: "你好！今天我能为您做些什么？",
		placeholder: "输入消息...",
		send: "发送",
		openChat: "打开聊天",
		closeChat: "关闭聊天",
		close: "关闭",
		messageLabel: "消息",
	},
} as const;

export type WidgetLanguage = keyof typeof translations;

export const DEFAULT_LANGUAGE: WidgetLanguage = "en";

export function isWidgetLanguage(value: unknown): value is WidgetLanguage {
	return typeof value === "string" && value in translations;
}
