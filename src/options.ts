import type { OptionDefinition, SvApi, Workspace, WorkspaceOptions } from "sv"
import { defineAddonOptions } from "sv"

export interface Args extends OptionDefinition {}

export type Run = Workspace & {
	/** Add-on options (includes dynamically added options from setup) */
	options: WorkspaceOptions<Args> & Record<string, unknown>
	/** Api to interact with the workspace. */
	sv: SvApi
	/** Cancel the addon at any time!
	 * @example
	 * return cancel('There is a problem with...');
	 */
	cancel: (reason: string) => void
}

export const options: Args = defineAddonOptions().build()
