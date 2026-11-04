import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JiraToolDependencies } from "./dependencies.js";
import { safely } from "./common.js";

export function registerCommentTools(server: McpServer, { jira }: JiraToolDependencies): void {
  server.tool(
    "add_comment",
    "Añade un comentario a un ticket.",
    {
      issueKey: z.string().min(1),
      body: z.string().min(1),
      visibilityType: z.enum(["role", "group"]).optional(),
      visibilityValue: z.string().optional(),
    },
    ({ issueKey, body, visibilityType, visibilityValue }) => {
      const visibility =
        visibilityType && visibilityValue ? { type: visibilityType, value: visibilityValue } : undefined;
      return safely(() => jira.addComment(issueKey, body, visibility));
    },
  );

  server.tool(
    "update_comment",
    "Actualiza el texto de un comentario existente.",
    { issueKey: z.string().min(1), commentId: z.string().min(1), body: z.string().min(1) },
    ({ issueKey, commentId, body }) => safely(() => jira.updateComment(issueKey, commentId, body)),
  );
}
