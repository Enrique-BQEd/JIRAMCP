import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JiraToolDependencies } from "./dependencies.js";
import { failure, safely } from "./common.js";

export function registerWorkflowTools(server: McpServer, { jira }: JiraToolDependencies): void {
  server.tool(
    "get_active_sprints",
    "Lista los sprints activos de un tablero Jira Software.",
    { boardId: z.number().int().positive() },
    ({ boardId }) => safely(() => jira.getActiveSprints(boardId)),
  );

  server.tool(
    "move_issues_to_active_sprint",
    "Mueve tickets al único sprint activo del tablero indicado.",
    {
      boardId: z.number().int().positive(),
      issueKeys: z.array(z.string().min(1)).min(1).max(50),
      confirm: z.boolean().default(false),
    },
    ({ boardId, issueKeys, confirm }) => {
      if (!confirm) {
        return Promise.resolve(failure(new Error("move_issues_to_active_sprint requiere confirm=true")));
      }
      return safely(async () => {
        const sprintPage = await jira.getActiveSprints(boardId);
        if (sprintPage.values.length === 0) {
          throw new Error(`No hay un sprint activo en el tablero ${boardId}`);
        }
        if (sprintPage.values.length > 1) {
          throw new Error(`Hay varios sprints activos en el tablero ${boardId}; usa get_active_sprints y decide cuál corresponde`);
        }
        const sprint = sprintPage.values[0];
        const response = await jira.moveIssuesToSprint(sprint.id, issueKeys);
        return { sprint, issueKeys, response };
      });
    },
  );

  server.tool(
    "transition_issue",
    "Ejecuta una transición disponible; consulta get_transitions para obtener su ID.",
    {
      issueKey: z.string().min(1),
      transitionId: z.string().min(1),
      fields: z.record(z.string(), z.unknown()).optional(),
      confirm: z.boolean().default(false),
    },
    ({ issueKey, transitionId, fields, confirm }) =>
      confirm
        ? safely(() => jira.transitionIssue(issueKey, transitionId, fields))
        : Promise.resolve(failure(new Error("transition_issue requiere confirm=true"))),
  );
}
