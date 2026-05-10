import i18n from "i18next"
import HttpBackend from "i18next-http-backend"
import { initReactI18next } from "react-i18next"
import { STORAGE_KEYS } from "@/lib/constants"

i18n
	.use(HttpBackend)
	.use(initReactI18next)
	.init({
		lng: localStorage.getItem(STORAGE_KEYS.LANG) ?? "en",
		fallbackLng: "en",
		ns: ["translation"],
		defaultNS: "translation",
		interpolation: { escapeValue: false },
		backend: {
			loadPath: "/locales/{{lng}}/{{ns}}.json",
		},
	})

export default i18n
