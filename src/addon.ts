import type { AgentName } from "@sveltejs/sv-utils"
import { color, resolveCommandArray } from "@sveltejs/sv-utils"
import { readdir } from "node:fs/promises"
import { resolve } from "node:path"
import type { Addon } from "sv"
import { defineAddon } from "sv"
import { transformAuth } from "./auth.ts"
import { generateCompose } from "./compose.ts"
import { generateDb } from "./db.ts"
import { upsertEnv } from "./env.ts"
import { transformGitignore } from "./gitignore.ts"
import { generateConfig } from "./kysely.ts"
import { generateMigration } from "./migration.ts"
import type { Args } from "./options.ts"
import { options } from "./options.ts"
import { transformPackage } from "./package.ts"
import { generateSchema } from "./schema.ts"
import { transformTsconfig } from "./tsconfig.ts"
import { editViteConfig } from "./vite.ts"

export const addon: Addon<Args, "@natoboram/sv-kysely"> = defineAddon({
	id: "@natoboram/sv-kysely",
	shortDescription: "database orm",
	homepage: "https://kysely.dev",
	options,

	setup: ({ isKit, unsupported, runsAfter }) => {
		runsAfter("betterAuth")
		runsAfter("drizzle")
		if (!isKit) unsupported("Requires SvelteKit")
	},

	run: async ({ sv, language, directory, cwd, file, packageManager }) => {
		const dbPath = resolve(cwd, directory.lib, "server", "db")
		const paths = {
			config: resolve(cwd, `kysely.config.${language}`),
			db: resolve(dbPath, `db.${language}`),
			migrations: resolve(dbPath, "migrations"),
			schema: resolve(dbPath, `schema.${language}`),
			seeds: resolve(dbPath, "seeds"),
			auth: resolve(cwd, directory.lib, "server", `auth.${language}`),
			workspace: resolve(cwd, "pnpm-workspace.yaml"),
		}

		// Dependencies
		sv.devDependency("@natoboram/load_env", "^2.0.3")
		sv.devDependency("@types/pg", "^8.23.1")
		sv.devDependency("kysely-codegen", "^0.20.0")
		sv.devDependency("kysely-ctl", "^0.21.0")
		sv.devDependency("kysely", "^0.29.6")
		sv.devDependency("pg", "^8.23.0")

		// Root files
		editViteConfig({ cwd, language, sv })
		sv.file(".env.local", upsertEnv())
		sv.file(".env", upsertEnv())
		sv.file("compose.yaml", generateCompose)
		sv.file(file.gitignore, transformGitignore())
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		sv.file(file.package, transformPackage({ cwd, packageManager }, dbPath))
		sv.file(paths.auth, transformAuth())
		sv.file(paths.config, generateConfig())
		transformTsconfig({ cwd, language, sv })

		// Server files
		sv.file(paths.db, generateDb())
		sv.file(paths.schema, generateSchema())

		// Migrations
		const migrations = await readdir(paths.migrations).catch(
			() => new Array<string>(),
		)
		if (!migrations.some(file => file.endsWith(`_init.${language}`)))
			sv.file(
				resolve(paths.migrations, `${Date.now()}_init.${language}`),
				generateMigration(),
			)
	},

	nextSteps: ({ packageManager }) => {
		const pm = pmer(packageManager)
		const steps: string[] = []

		steps.push(`Run ${pm("run", ["db:start"])} to start the docker container`)
		steps.push(`Run ${pm("run", ["db:regenerate"])} to reset the database`)
		steps.push(
			`Check ${color.env("DATABASE_URL")} in ${color.path(".env.local")} and adjust it to your needs`,
		)

		return steps
	},
})

function pmer(packageManager: AgentName) {
	return (command: Parameters<typeof resolveCommandArray>[1], args: string[]) =>
		color.command(resolveCommandArray(packageManager, command, args))
}
