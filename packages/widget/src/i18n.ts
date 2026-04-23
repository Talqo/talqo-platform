import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import cs from "./locales/cs.json"
import en from "./locales/en.json"
import zh from "./locales/zh.json"

const resources = {
	en: { translation: en },
	cs: { translation: cs },
	zh: { translation: zh },
}

i18n.use(initReactI18next).init({
	lng:
		(typeof window !== "undefined" && localStorage.getItem("pagepal:lang")) ||
		"en",
	fallbackLng: "en",
	resources,
	interpolation: { escapeValue: false },
})

export default i18n
