import type { TransformFn } from "@sveltejs/sv-utils"
import { dedent, transforms } from "@sveltejs/sv-utils"
import { dirname, resolve } from "node:path"
import type {
	Addon,
	OptionDefinition,
	SvApi,
	Workspace,
	WorkspaceOptions,
} from "sv"
import { defineAddon, defineAddonOptions } from "sv"
import { fileExists, svelteConfig } from "./sv-utils.ts"

interface Args extends OptionDefinition {}

type Run = Workspace & {
	/** Add-on options (includes dynamically added options from setup) */
	options: WorkspaceOptions<Args> & Record<string, unknown>
	/** Api to interact with the workspace. */
	sv: SvApi
	/** Cancel the addon at any time!
	 * @example
	 * return cancel('There is a problem with...');
	 */
	cancel: (reason: string) => void
}

const options: Args = defineAddonOptions().build()

const addon: Addon<Args, "@natoboram/sv-kysely"> = defineAddon({
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
		sv.file(file.package, transformPackageJson(cwd))
		sv.file(paths.config, generateConfig())
		transformTsConfig({ cwd, language, sv })

		// Server files
		sv.file(paths.db, generateDb())
	},
})

export default addon

function generateEnv(): TransformFn {
	return transforms.text(({ content, text }) => {
		const key = "DATABASE_URL"
		const comment = "Kysely"
		const value = "postgres://root:mysecretpassword@localhost:5432/local"

		return text.upsert(content, key, { value, comment, separator: true })
	})
}

function generateCompose(): string {
	return dedent`
services:
  db:
    image: postgres:18
    restart: always
    ports:
      - 5432:5432
    environment:
      POSTGRES_USER: root
      POSTGRES_PASSWORD: mysecretpassword
      POSTGRES_DB: local
    volumes:
      - pgdata:/var/lib/postgresql
volumes:
  pgdata:
`.trim()
}

function transformPackageJson(cwd: string): TransformFn {
	return transforms.json(({ data, json }) => {
		json.packageScriptsUpsert(
			data,
			"db:start",
			"docker compose up --detach --force-recreate --remove-orphans",
		)
		json.packageScriptsUpsert(
			data,
			"db:stop",
			"docker compose down --remove-orphans",
		)
		json.packageScriptsUpsert(
			data,
			"db:generate",
			"kysely-codegen --dialect postgres --env-file .env.local --out-file src/lib/server/db/schema.ts --singularize",
		)
		json.packageScriptsUpsert(data, "db:migrate", "kysely migrate:latest")
		json.packageScriptsUpsert(data, "db:migrate:up", "kysely migrate:up")
		json.packageScriptsUpsert(data, "db:migrate:down", "kysely migrate:down")
		json.packageScriptsUpsert(data, "db:migrate:make", "kysely migrate:make")
		json.packageScriptsUpsert(data, "db:seed:list", "kysely seed list")
		json.packageScriptsUpsert(data, "db:seed:make", "kysely seed make")
		json.packageScriptsUpsert(data, "db:seed:run", "kysely seed run")
		json.packageScriptsUpsert(
			data,
			"db:reset",
			`docker compose down; docker volume rm ${dirname(cwd)}_pgdata`,
		)
		json.packageScriptsUpsert(
			data,
			"db:regenerate",
			"pnpm run db:reset && pnpm run db:start && sleep 11 && pnpm run db:migrate && pnpm run db:generate && pnpm run dev",
		)
	})
}

function generateConfig(): TransformFn {
	return transforms.script(({ ast, js }) => {
		js.imports.addNamed(ast, {
			from: "@natoboram/load_env",
			imports: { loadEnv: "loadEnv" },
		})
		js.imports.addNamed(ast, {
			from: "kysely-ctl",
			imports: { defineConfig: "defineConfig" },
		})
		js.imports.addNamed(ast, {
			from: "kysely",
			imports: {
				PostgresAdapter: "PostgresAdapter",
				PostgresDriver: "PostgresDriver",
				PostgresIntrospector: "PostgresIntrospector",
				PostgresQueryCompiler: "PostgresQueryCompiler",
			},
		})
		js.imports.addNamed(ast, { from: "pg", imports: { Pool: "Pool" } })

		ast.body.push(js.common.parseStatement("await loadEnv({ override: true })"))

		const config = js.variables.declaration(ast, {
			kind: "const",
			name: "config",
			value: js.common.parseExpression(
				dedent`
defineConfig({
	dialect: {
		createAdapter() {
			return new PostgresAdapter();
		},
		createDriver() {
			const pool = new Pool({ connectionString: process.env.DATABASE_URL });
			return new PostgresDriver({ pool });
		},
		createIntrospector(db) {
			return new PostgresIntrospector(db);
		},
		createQueryCompiler() {
			return new PostgresQueryCompiler();
		}
	},
	migrations: { migrationFolder: 'src/lib/server/db/migrations' },
	seeds: { seedFolder: 'src/lib/server/db/seeds' }
});
`.trim(),
			),
		})

		js.exports.createNamed(ast, {
			name: "config",
			fallback: config,
		})
	})
}

function transformTsConfig({
	cwd,
	language,
	sv,
}: Pick<Run, "cwd" | "language" | "sv">) {
	const tsPath = language === "ts" ? "tsconfig.json" : "jsconfig.json"
	if (fileExists(cwd, tsPath))
		return sv.file(
			tsPath,
			transforms.json(({ data }) => {
				const include: string[] = (data.include ??= ["src"])
				const configPath = `kysely.config.${language}`
				if (include.includes(configPath)) return

				include.push(configPath)
			}),
		)

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

// import { env } from '$env/dynamic/private';
// import { Kysely, PostgresDialect } from 'kysely';
// import { Pool } from 'pg';
// import type { DB } from './schema.ts';

// if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// const pool = new Pool({ connectionString: env.DATABASE_URL });
// const dialect = new PostgresDialect({ pool });
// export const db: Kysely<DB> = new Kysely({ dialect });

function generateDb(): TransformFn {
	return transforms.script(({ ast, js }) => {
		js.imports.addNamed(ast, {
			from: "$env/dynamic/private",
			imports: { env: "env" },
		})
		js.imports.addNamed(ast, {
			from: "kysely",
			imports: { Kysely: "Kysely", PostgresDialect: "PostgresDialect" },
		})
		js.imports.addNamed(ast, {
			from: "pg",
			imports: { Pool: "Pool" },
		})
		js.imports.addNamed(ast, {
			from: "./schema.ts",
			imports: { DB: "DB" },
			isType: true,
		})

		ast.body.push(
			js.common.parseStatement(
				`if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');`,
			),
		)

		ast.body.push(
			js.variables.declaration(ast, {
				kind: "const",
				name: "pool",
				value: js.common.parseExpression(
					`new Pool({ connectionString: env.DATABASE_URL })`,
				),
			}),
		)

		ast.body.push(
			js.variables.declaration(ast, {
				kind: "const",
				name: "dialect",
				value: js.common.parseExpression(`new PostgresDialect({ pool })`),
			}),
		)

		const db = js.variables.declaration(ast, {
			kind: "const",
			name: "db",
			value: js.common.parseExpression(`new Kysely<DB>({ dialect })`),
		})

		js.exports.createNamed(ast, {
			name: "db",
			fallback: db,
		})
	})
}
