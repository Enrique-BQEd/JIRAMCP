import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JiraToolDependencies } from "./dependencies.js";
import { registerCommentTools } from "./comments.js";
import { registerCollaborationTools } from "./collaboration.js";
import { registerIssueTools } from "./issues.js";
import { registerProjectTools } from "./projects.js";
import { registerReadTools } from "./read.js";
import { registerWorkflowTools } from "./workflow.js";

export function registerAllTools(server: McpServer, dependencies: JiraToolDependencies): void {
  registerReadTools(server, dependencies);
  registerProjectTools(server, dependencies);
  registerIssueTools(server, dependencies);
  registerWorkflowTools(server, dependencies);
  registerCommentTools(server, dependencies);
  registerCollaborationTools(server, dependencies);
}
