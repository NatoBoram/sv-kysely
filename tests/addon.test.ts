import fs from "node:fs"
import path, { resolve } from "node:path"
import { expect } from "vitest"
import addon from "../src/index.js"
import { isPackageJson } from "../src/package.js"
import { setupTest } from "./setup/suite.js"

const { test, testCases } = setupTest(
	{ addon },
	{
		kinds: [{ type: "default", options: { [addon.id]: {} } }],
		filter: testCase => testCase.variant.includes("kit"),
		browser: false,
	},
)

test.concurrent.for(testCases)(
	"@natoboram/sv-kysely $kind.type $variant",
	(testCase, ctx) => {
		const cwd = ctx.cwd(testCase)
		const language = testCase.variant.includes("ts") ? "ts" : "js"

		const dbPath = path.resolve(cwd, `src/lib/server/db/db.${language}`)
		const db = fs.readFileSync(dbPath, "utf8")
		expect(db).toContain("$env/dynamic/private")
		expect(db).toContain("new Kysely<DB>")

		const schemaPath = path.resolve(cwd, `src/lib/server/db/schema.${language}`)
		const schema = fs.readFileSync(schemaPath, "utf8")
		expect(schema).toContain("export interface DB")

		const migrationsPath = path.resolve(cwd, "src/lib/server/db/migrations")
		const migrationFile = fs
			.readdirSync(migrationsPath)
			.find(file => file.endsWith(`_init.${language}`))
		expect(migrationFile).toBeDefined()
		if (!migrationFile) throw new Error("Initial migration was not generated")

		const migration = fs.readFileSync(
			path.resolve(migrationsPath, migrationFile),
			"utf8",
		)
		expect(migration).toContain("export async function up(db: Kysely<unknown>)")
		expect(migration).toContain(
			"export async function down(db: Kysely<unknown>)",
		)

		const configPath = path.resolve(cwd, `kysely.config.${language}`)
		const config = fs.readFileSync(configPath, "utf8")
		expect(config).toContain("await loadEnv({ override: true })")
		expect(config).toContain("src/lib/server/db/migrations")
		expect(config).toContain("src/lib/server/db/seeds")

		const packagePath = path.resolve(cwd, "package.json")
		const parsedPackageJson: unknown = JSON.parse(
			fs.readFileSync(packagePath, "utf8"),
		)
		if (!isPackageJson(parsedPackageJson)) {
			throw new Error(
				"Generated package.json is missing scripts or dependencies",
			)
		}
		const packageJson = parsedPackageJson
		expect(
			Object.keys(packageJson.scripts).some(script => script.startsWith("db:")),
		).toBe(true)
		expect(packageJson.devDependencies.kysely).toBeDefined()
		expect(packageJson.devDependencies["kysely-codegen"]).toBeDefined()
		expect(packageJson.devDependencies["kysely-ctl"]).toBeDefined()
		expect(packageJson.devDependencies.pg).toBeDefined()

		for (const filename of [".env", ".env.local"]) {
			const envPath = path.resolve(cwd, filename)
			const env = fs.readFileSync(envPath, "utf8")
			expect(env).toContain("DATABASE_URL")
		}

		const composePath = path.resolve(cwd, "compose.yaml")
		const compose = fs.readFileSync(composePath, "utf8")
		expect(compose).toContain("image: postgres")

		const vitePath = resolve(cwd, `vite.config.${language}`)
		const viteConfig = fs.readFileSync(vitePath, "utf8")
		expect(viteConfig).toContain(`../kysely.config.${language}`)
	},
)
