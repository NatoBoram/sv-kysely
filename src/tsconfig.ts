import type { Run } from "./options.ts"
import { fileExists, transforms } from "./sv-utils.ts"

export function transformTsconfig({
	language,
	cwd,
	sv,
}: Pick<Run, "cwd" | "language" | "sv">): void {
	const configFile =
		language === "ts" ? "tsconfig.eslint.json" : "jsconfig.eslint.json"
	if (!fileExists(cwd, configFile)) return

	sv.file(
		configFile,
		transforms.json(({ data }) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			const include: string[] = (data.include ??= ["src"])
			if (include.includes(`kysely.config.${language}`)) return
			include.push(`kysely.config.${language}`)
		}),
	)
}
