import type { TransformFn } from "@sveltejs/sv-utils"
import { transforms } from "@sveltejs/sv-utils"
import { basename } from "node:path"

export function transformPackage(cwd: string): TransformFn {
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
			`docker compose down; docker volume rm ${basename(cwd)}_pgdata`,
		)
		json.packageScriptsUpsert(
			data,
			"db:regenerate",
			"pnpm run db:reset && pnpm run db:start && sleep 11 && pnpm run db:migrate && pnpm run db:generate && pnpm run dev",
		)
	})
}
