import { svelteConfig } from "@sveltejs/sv-utils"
import type { Run } from "./options.ts"

export function editViteConfig({
	cwd,
	language,
	sv,
}: Pick<Run, "cwd" | "language" | "sv">): void {
	return svelteConfig.edit({ sv, cwd }, ({ override, js }) => {
		override({
			typescript: {
				config: js.common.parseExpression(
					`(config) => { config.include.push('../kysely.config.${language}')}`,
				),
			},
		})
	})
}
