import type { TransformFn } from "@sveltejs/sv-utils"
import { dedent, transforms } from "@sveltejs/sv-utils"

export function generateConfig(): TransformFn {
	return transforms.script(({ ast, js }) => {
		const defineConfig = js.imports.find(ast, {
			from: "kysely-ctl",
			name: "defineConfig",
		})
		if (defineConfig.alias) return false
		ast.body.length = 0

		js.imports.addNamed(ast, {
			from: "@natoboram/load_env",
			imports: { loadEnv: "loadEnv" },
		})
		js.imports.addNamed(ast, {
			from: "kysely",
			imports: { PostgresDialect: "PostgresDialect" },
		})
		js.imports.addNamed(ast, {
			from: "kysely-ctl",
			imports: { DefineConfigInput: "DefineConfigInput" },
			isType: true,
		})
		js.imports.addNamed(ast, {
			from: "kysely-ctl",
			imports: { defineConfig: "defineConfig" },
		})
		js.imports.addNamed(ast, { from: "pg", imports: { Pool: "Pool" } })

		ast.body.push(js.common.parseStatement("await loadEnv({ override: true })"))

		ast.body.push(
			js.variables.declaration(ast, {
				kind: "const",
				name: "pool",
				value: js.common.parseExpression(
					"new Pool({ connectionString: process.env.DATABASE_URL });",
				),
			}),
		)

		ast.body.push(
			js.variables.declaration(ast, {
				kind: "const",
				name: "dialect",
				value: js.common.parseExpression("new PostgresDialect({ pool });"),
			}),
		)

		const config = js.variables.declaration(ast, {
			kind: "const",
			name: "config",
			value: js.common.parseExpression(
				dedent`
defineConfig({
	dialect,
	migrations: { migrationFolder: 'src/lib/server/db/migrations' },
	seeds: { seedFolder: 'src/lib/server/db/seeds' }
});
`.trim(),
			),
		})

		ast.body.push(config)

		js.exports.createDefault(ast, {
			fallback: js.common.parseExpression("config"),
		})

		return
	})
}
