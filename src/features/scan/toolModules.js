// The tools scanService and scanRun can run, keyed by id. Each tool module is
// pure and lives with its page; adding a tool means adding it here.
// Regulations is not listed: regulationsService runs its own query and fallback.

import { debuggerTool } from "../debugger/debuggerTool.js"
import { auditTool } from "../audit/auditTool.js"
import { loopholesTool } from "../loopholes/loopholesTool.js"

export const TOOL_MODULES = {
  [debuggerTool.id]: debuggerTool,
  [auditTool.id]: auditTool,
  [loopholesTool.id]: loopholesTool,
}
