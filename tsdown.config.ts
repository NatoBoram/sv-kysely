import type { UserConfig } from "tsdown"
import { defineConfig } from "tsdown"

const config: UserConfig = defineConfig({
	entry: ["src/index.ts"],
	format: "esm",
})

export default config
