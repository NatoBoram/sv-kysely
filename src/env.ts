import type { TransformFn } from "@sveltejs/sv-utils"
import { transforms } from "@sveltejs/sv-utils"

export function upsertEnv(): TransformFn {
	return transforms.text(({ content, text }) => {
		const key = "DATABASE_URL"
		const comment = "Kysely"
		const value = "postgres://root:mysecretpassword@localhost:5432/local"

		return text.upsert(content, key, { value, comment, separator: true })
	})
}
