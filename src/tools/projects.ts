import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JiraToolDependencies } from "./dependencies.js";
import { safely } from "./common.js";

export function registerProjectTools(
  server: McpServer,
  { jira, projectConfig }: JiraToolDependencies,
): void {
  server.tool(
    "get_project",
    "Obtiene los metadatos de un proyecto Jira.",
    { projectKey: z.string().min(1) },
    ({ projectKey }) => safely(() => jira.getProject(projectKey)),
  );

  server.tool(
    "get_project_versions",
    "Lista las versiones de un proyecto.",
    { projectKey: z.string().min(1) },
    ({ projectKey }) => safely(() => jira.getVersions(projectKey)),
  );

  server.tool(
    "get_project_config",
    "Lee la configuración local del MCP para un proyecto.",
    { projectKey: z.string().min(1) },
    ({ projectKey }) => safely(() => projectConfig.get(projectKey)),
  );

  server.tool(
    "set_project_config",
    "Guarda preferencias locales del MCP para un proyecto; no modifica la administración de Jira.",
    {
      projectKey: z.string().min(1),
      alias: z.string().optional(),
      jqlDefault: z.string().optional(),
      fields: z.array(z.string()).optional(),
      allowed: z.boolean().optional(),
      boardId: z.number().int().positive().optional(),
      destinations: z
        .record(
          z.object({
            boardId: z.number().int().positive().optional(),
            sprintId: z.number().int().positive().optional(),
            sprintName: z.string().optional(),
          }),
        )
        .optional(),
    },
    ({ projectKey, alias, jqlDefault, fields, allowed, boardId, destinations }) =>
      safely(() => projectConfig.set(projectKey, {
        alias,
        jqlDefault,
        fields,
        allowed,
        boardId,
        destinations,
      })),
  );
}
