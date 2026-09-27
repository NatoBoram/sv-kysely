import type { TransformFn } from "@sveltejs/sv-utils"
import { transforms } from "@sveltejs/sv-utils"

export function generateMigration(): TransformFn {
	return transforms.script(({ ast, js, content }) => {
		if (content.length) return false

		js.imports.addNamed(ast, {
			from: "kysely",
			imports: { Kysely: "Kysely" },
			isType: true,
		})

		js.imports.addNamed(ast, {
			from: "kysely",
			imports: { sql: "sql" },
		})

		ast.body.push(
			js.common
				.parseStatement(`export async function up(db: Kysely<unknown>): Promise<void> {
	await db.schema
		.createTable('task')
		.addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql\`uuidv7()\`))
		.addColumn('title', 'text', (col) => col.notNull())
		.addColumn('priority', 'integer', (col) => col.notNull().defaultTo(1))
		.execute();
}`),
		)

		ast.body.push(
			js.common
				.parseStatement(`export async function down(db: Kysely<unknown>): Promise<void> {
	await db.schema.dropTable('task').execute();
}`),
		)

		return
	})
}
