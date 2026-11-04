import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JiraToolDependencies } from "./dependencies.js";
import { failure, safely } from "./common.js";

export function registerCollaborationTools(server: McpServer, { jira }: JiraToolDependencies): void {
  server.tool(
    "link_issues",
    "Crea un enlace entre dos tickets.",
    {
      linkType: z.string().min(1),
      inwardIssue: z.string().min(1),
      outwardIssue: z.string().min(1),
      comment: z.string().optional(),
      confirm: z.boolean().default(false),
    },
    ({ linkType, inwardIssue, outwardIssue, comment, confirm }) =>
      confirm
        ? safely(() => jira.linkIssues(linkType, inwardIssue, outwardIssue, comment))
        : Promise.resolve(failure(new Error("link_issues requiere confirm=true"))),
  );

  server.tool(
    "add_worklog",
    "Registra tiempo trabajado en un ticket.",
    {
      issueKey: z.string().min(1),
      timeSpent: z.string().min(1),
      comment: z.string().optional(),
      started: z.string().optional(),
    },
    ({ issueKey, timeSpent, comment, started }) =>
      safely(() => jira.addWorklog(issueKey, timeSpent, comment, started)),
  );

  server.tool(
    "get_watchers",
    "Lista los usuarios que observan un ticket.",
    { issueKey: z.string().min(1) },
    ({ issueKey }) => safely(() => jira.getWatchers(issueKey)),
  );

  server.tool(
    "add_watcher",
    "Añade un usuario como watcher de un ticket.",
    { issueKey: z.string().min(1), username: z.string().min(1), confirm: z.boolean().default(false) },
    ({ issueKey, username, confirm }) =>
      confirm
        ? safely(() => jira.addWatcher(issueKey, username))
        : Promise.resolve(failure(new Error("add_watcher requiere confirm=true"))),
  );

  server.tool(
    "remove_watcher",
    "Elimina un usuario de los watchers de un ticket.",
    { issueKey: z.string().min(1), username: z.string().min(1), confirm: z.boolean().default(false) },
    ({ issueKey, username, confirm }) =>
      confirm
        ? safely(() => jira.removeWatcher(issueKey, username))
        : Promise.resolve(failure(new Error("remove_watcher requiere confirm=true"))),
  );
}
