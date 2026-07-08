import i18n from "i18next"
import HttpBackend from "i18next-http-backend"
import { initReactI18next } from "react-i18next"
import { STORAGE_KEYS } from "@/lib/constants"
// biome-ignore lint/style/noRestrictedImports: keep the bundled default locale in sync with the public i18n file.
import enTranslation from "../../public/locales/en/translation.json"

i18n
	.use(HttpBackend)
	.use(initReactI18next)
	.init({
		lng: localStorage.getItem(STORAGE_KEYS.LANG) ?? "en",
		fallbackLng: "en",
		ns: ["translation"],
		defaultNS: "translation",
		partialBundledLanguages: true,
		resources: {
			en: {
				translation: enTranslation,
			},
		},
		interpolation: { escapeValue: false },
		backend: {
			loadPath: "/locales/{{lng}}/{{ns}}.json",
		},
	})

export default i18n
