import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JiraToolDependencies } from "./dependencies.js";
import { failure, safely } from "./common.js";

export function registerIssueTools(server: McpServer, { jira }: JiraToolDependencies): void {
  server.tool(
    "edit_issue",
    "Edita campos explícitos de un ticket. Jira sigue aplicando sus permisos.",
    {
      issueKey: z.string().min(1),
      fields: z.record(z.string(), z.unknown()),
      update: z.record(z.string(), z.unknown()).optional(),
    },
    ({ issueKey, fields, update }) => safely(() => jira.editIssue(issueKey, fields, update)),
  );

  server.tool(
    "assign_issue",
    "Asigna un ticket a un username Jira o usa null para desasignarlo.",
    { issueKey: z.string().min(1), username: z.string().nullable() },
    ({ issueKey, username }) => safely(() => jira.assignIssue(issueKey, username)),
  );

  server.tool(
    "create_issue",
    "Crea un issue con los campos Jira proporcionados.",
    { fields: z.record(z.string(), z.unknown()), confirm: z.boolean().default(false) },
    ({ fields, confirm }) =>
      confirm
        ? safely(() => jira.createIssue(fields))
        : Promise.resolve(failure(new Error("create_issue requiere confirm=true"))),
  );

  server.tool(
    "create_subtask",
    "Crea una subtarea bajo un ticket padre.",
    {
      parentKey: z.string().min(1),
      fields: z.record(z.string(), z.unknown()),
      confirm: z.boolean().default(false),
    },
    ({ parentKey, fields, confirm }) =>
      confirm
        ? safely(() => jira.createSubtask(parentKey, fields))
        : Promise.resolve(failure(new Error("create_subtask requiere confirm=true"))),
  );
}
