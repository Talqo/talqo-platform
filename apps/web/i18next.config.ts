import {
	defineConfig,
	recommendedAcceptedAttributes,
	recommendedAcceptedTags,
} from "i18next-cli"

export default defineConfig({
	locales: ["en", "cs", "zh"],
	extract: {
		input: ["src/**/*.{ts,tsx}"],
		output: "public/locales/{{language}}/{{namespace}}.json",
		defaultNS: "translation",
		primaryLanguage: "en",
		indentation: "\t",
		removeUnusedKeys: true,
	},
	lint: {
		acceptedAttributes: recommendedAcceptedAttributes,
		acceptedTags: recommendedAcceptedTags,
		ignore: ["src/components/ui/**", "src/api/generated/**"],
	},
})
