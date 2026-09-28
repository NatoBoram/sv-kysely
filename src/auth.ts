import type { TransformFn } from "@sveltejs/sv-utils"
import { transforms } from "@sveltejs/sv-utils"

export function transformAuth(): TransformFn {
	return transforms.script(({ ast, js }) => {
		const drizzle = js.imports.find(ast, { from: "$lib/server/db", name: "db" })
		const drizzleAdapter = js.imports.find(ast, {
			from: "better-auth/adapters/drizzle",
			name: "drizzleAdapter",
		})
		if (!drizzleAdapter.alias || !drizzle.alias) return false

		// Remove imports
		js.imports.remove(ast, {
			from: "better-auth/adapters/drizzle",
			name: "drizzleAdapter",
		})
		js.imports.remove(ast, { from: "better-auth/minimal", name: "betterAuth" })
		js.imports.remove(ast, { from: "$lib/server/db", name: "db" })

		// Add imports
		js.imports.addNamed(ast, {
			from: "$lib/server/db/db",
			imports: { db: "db" },
		})
		js.imports.addNamed(ast, {
			from: "better-auth",
			imports: { betterAuth: "betterAuth" },
		})

		// Find an export
		const exported = ast.body.find(
			node => node.type === "ExportNamedDeclaration",
		)
		if (exported?.declaration?.type !== "VariableDeclaration") return false

		// Find a call in that export
		const call = exported.declaration.declarations.find(
			node => node.init?.type === "CallExpression",
		)
		if (call?.init?.type !== "CallExpression") return false

		// Find an object argument in that call
		const argument = call.init.arguments.find(
			arg => arg.type === "ObjectExpression",
		)
		if (argument?.type !== "ObjectExpression") return false

		// Find the database property in that argument
		const database = argument.properties.find(
			prop =>
				prop.type === "Property" &&
				prop.key.type === "Identifier" &&
				prop.key.name === "database" &&
				prop.value.type === "CallExpression",
		)
		if (
			database?.type !== "Property" ||
			database.key.type !== "Identifier" ||
			database.key.name !== "database" ||
			database.value.type !== "CallExpression"
		)
			return false

		// Replace the database object
		const [db] = database.value.arguments
		database.value = js.object.create({
			db,
			type: "postgres",
			casing: "snake",
			transaction: true,
		})

		return
	})
}
