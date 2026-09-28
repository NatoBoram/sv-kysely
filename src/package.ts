import type { TransformFn } from "@sveltejs/sv-utils"
import { transforms } from "@sveltejs/sv-utils"
import { rmSync } from "node:fs"
import { basename, resolve } from "node:path"
import type { Run } from "./options.ts"

export function transformPackage(
	{ cwd, packageManager }: Pick<Run, "cwd" | "packageManager">,
	dbPath: string,
): TransformFn {
	return transforms.json(({ data }) => {
		if (!isPackageJson(data)) return false

		data.scripts["db:start"] =
			"docker compose up --detach --force-recreate --remove-orphans"
		data.scripts["db:stop"] = "docker compose down --remove-orphans"
		data.scripts["db:generate"] =
			"kysely-codegen --dialect postgres --env-file .env.local --out-file src/lib/server/db/schema.ts --singularize"
		data.scripts["db:migrate"] = "kysely migrate:latest"
		data.scripts["db:migrate:up"] = "kysely migrate:up"
		data.scripts["db:migrate:down"] = "kysely migrate:down"
		data.scripts["db:migrate:make"] = "kysely migrate:make"
		data.scripts["db:seed:list"] = "kysely seed list"
		data.scripts["db:seed:make"] = "kysely seed make"
		data.scripts["db:seed:run"] = "kysely seed run"
		data.scripts["db:reset"] =
			`docker compose down; docker volume rm ${basename(cwd)}_pgdata`
		data.scripts["db:regenerate"] =
			`${packageManager} run db:reset && ${packageManager} run db:start && sleep 11 && ${packageManager} run db:migrate && ${packageManager} run db:generate && ${packageManager} run dev`

		// Better Auth
		if (data.scripts["auth:schema"]) {
			data.scripts["auth:schema"] =
				"auth generate --config src/lib/server/auth.ts --output src/lib/server/db/auth.schema.sql --yes"
			rmSync(resolve(dbPath, "auth.schema.ts"), { force: true })
		}

		// Drizzle
		delete data.scripts["db:push"]
		delete data.scripts["db:studio"]

		return
	})
}

interface PackageJson {
	readonly scripts: Record<string, string>
	readonly devDependencies: Record<string, string>
}

function isStringRecord(value: unknown): value is Record<string, string> {
	if (typeof value !== "object" || value === null) return false
	return Object.values(value).every(entry => typeof entry === "string")
}

export function isPackageJson(value: unknown): value is PackageJson {
	if (typeof value !== "object" || value === null) return false
	return (
		"scripts" in value &&
		"devDependencies" in value &&
		isStringRecord(value.scripts) &&
		isStringRecord(value.devDependencies)
	)
}
