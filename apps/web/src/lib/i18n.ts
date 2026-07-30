import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import cs from "../locales/cs.json";
import en from "../locales/en.json";
import zh from "../locales/zh.json";
import { getStoredLanguage, subscribeLanguage } from "./use-language";

// Dashboard UI translations. Uses the shared default i18next instance so
// plain useTranslation() works in web components; the widget package never
// touches the default instance (it creates isolated ones via i18next's
// createInstance), so there is no clash. Imported for side effects in
// main.tsx. Language follows lib/use-language.ts's stored preference.
i18next.use(initReactI18next).init({
	lng: getStoredLanguage(),
	fallbackLng: "en",
	resources: {
		en: { translation: en },
		cs: { translation: cs },
		zh: { translation: zh },
	},
	interpolation: { escapeValue: false },
	react: { useSuspense: false },
});

subscribeLanguage(() => {
	i18next.changeLanguage(getStoredLanguage());
});
