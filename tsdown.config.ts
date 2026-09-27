import type { UserConfig } from "tsdown"
import { defineConfig } from "tsdown"

const config: UserConfig = defineConfig({
	entry: ["src/index.ts", "src/sv-utils.ts"],
	format: "esm",
})

export default config
