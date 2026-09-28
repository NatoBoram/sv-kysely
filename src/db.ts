import type { TransformFn } from "@sveltejs/sv-utils"
import { transforms } from "@sveltejs/sv-utils"

export function generateDb(): TransformFn {
	return transforms.script(({ ast, js }) => {
		const kysely = js.imports.find(ast, { from: "kysely", name: "Kysely" })
		if (kysely.alias) return false
		ast.body.length = 0

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

		return
	})
}
