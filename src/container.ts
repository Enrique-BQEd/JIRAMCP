import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JiraConfig } from "./config.js";
import { JiraClient } from "./jira-client.js";
import { ProjectConfigStore } from "./project-config.js";
import { registerAllTools } from "./tools/register.js";
import type { JiraToolDependencies } from "./tools/dependencies.js";
import { registerDocumentationResources } from "./resources/jira-docs.js";
import { registerJiraSkills } from "./prompts/jira-skills.js";

export function createDependencies(config: JiraConfig): JiraToolDependencies {
  return {
    jira: new JiraClient(config),
    projectConfig: new ProjectConfigStore(config.projectConfigPath, config.allowedProjects),
  };
}

export function createMcpServer(dependencies: JiraToolDependencies): McpServer {
  const server = new McpServer({
    name: "jira-server-mcp",
    version: "0.1.0",
  });
  registerAllTools(server, dependencies);
  registerDocumentationResources(server);
  registerJiraSkills(server);
  return server;
}
