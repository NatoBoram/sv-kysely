import { type TransformFn, transforms } from "./sv-utils.ts"

export function transformGitignore(): TransformFn {
	return transforms.text(({ content, text }) => {
		if (!content.length) return false
		const start = content.indexOf("# Env")
		const end = content.indexOf("\n\n", start) + 2
		content = content.slice(0, start) + content.slice(end)
		return text.upsert(
			content,
			["!.env", "!.env.*", ".env.local", ".env.*.local"].join("\n"),
			{ comment: "Env", separator: true },
		)
	})
}
