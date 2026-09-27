import type { ViteUserConfig } from "vitest/config"
import { defineConfig } from "vitest/config"

const ONE_MINUTE = 1000 * 60

const config: ViteUserConfig = defineConfig({
	test: {
		include: ["tests/**/*.test.{js,ts}"],
		exclude: ["tests/setup/*"],
		testTimeout: ONE_MINUTE * 3,
		hookTimeout: ONE_MINUTE * 3,
		globalSetup: ["tests/setup/global.js"],
		expect: {
			requireAssertions: true,
		},
	},
})

export default config
