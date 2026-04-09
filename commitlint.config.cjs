/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
	extends: ["@commitlint/config-conventional"],
	rules: {
		// Types allowed in commit messages
		"type-enum": [
			2,
			"always",
			[
				"feat", // new feature
				"fix", // bug fix
				"chore", // maintenance (deps, config, tooling)
				"docs", // documentation only
				"style", // formatting, no logic change
				"refactor", // code change that's not feat or fix
				"test", // adding or updating tests
				"perf", // performance improvement
				"ci", // CI/CD changes
				"revert", // revert a previous commit
			],
		],
		"subject-empty": [2, "never"],
		"subject-full-stop": [2, "never", "."],
		"header-max-length": [2, "always", 100],
		"body-leading-blank": [1, "always"],
		"footer-leading-blank": [1, "always"],
	},
};
