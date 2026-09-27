import { resolve } from "node:path"
import type { Addon } from "sv"
import { defineAddon } from "sv"
import { generateCompose } from "./compose.ts"
import { generateDb } from "./db.ts"
import { generateEnv } from "./env.ts"
import { transformGitignore } from "./gitignore.ts"
import { generateConfig } from "./kysely.ts"
import { generateMigration } from "./migration.ts"
import type { Args } from "./options.ts"
import { options } from "./options.ts"
import { transformPackage } from "./package.ts"
import { generateSchema } from "./schema.ts"
import { editViteConfig } from "./vite.ts"

export const addon: Addon<Args, "@natoboram/sv-kysely"> = defineAddon({
	id: "@natoboram/sv-kysely",
	shortDescription: "database orm",
	homepage: "https://kysely.dev",
	options,

	setup: ({ isKit, unsupported, runsAfter }) => {
		runsAfter("prettier")
		runsAfter("sveltekitAdapter")
		runsAfter("experimental")

		if (!isKit) unsupported("Requires SvelteKit")
	},

	run: ({ sv, language, directory, cwd, file }) => {
		const dbPath = resolve(cwd, directory.lib, "server", "db")
		const paths = {
			config: resolve(cwd, `kysely.config.${language}`),
			db: resolve(dbPath, `db.${language}`),
			migrations: resolve(dbPath, "migrations"),
			schema: resolve(dbPath, `schema.${language}`),
			seeds: resolve(dbPath, "seeds"),
		}

		// Dependencies
		sv.devDependency("@natoboram/load_env", "^2.0.3")
		sv.devDependency("@types/pg", "^8.23.1")
		sv.devDependency("kysely-codegen", "^0.20.0")
		sv.devDependency("kysely-ctl", "^0.21.0")
		sv.devDependency("kysely", "^0.29.6")
		sv.devDependency("pg", "^8.23.0")

		// Root files
		sv.file(".env.local", generateEnv())
		sv.file(".env", generateEnv())
		sv.file("compose.yaml", generateCompose)
		editViteConfig({ cwd, language, sv })
		sv.file(file.gitignore, transformGitignore())
		sv.file(file.package, transformPackage(cwd))
		sv.file(paths.config, generateConfig())

		// Server files
		sv.file(paths.db, generateDb())
		sv.file(paths.schema, generateSchema())
		sv.file(
			resolve(paths.migrations, `${Date.now()}_init.ts`),
			generateMigration(),
		)
	},
})
