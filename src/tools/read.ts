import { z } from "zod";
import * as XLSX from "xlsx";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  DOCUMENT_MAX_BYTES,
  extractDocx,
  extractPdf,
  supportedDocumentFormat,
} from "../attachments/document-extractor.js";
import type { JiraToolDependencies } from "./dependencies.js";
import { failure, jqlString, result, safely } from "./common.js";

export function registerReadTools(server: McpServer, { jira }: JiraToolDependencies): void {
  server.tool(
    "get_server_info",
    "Comprueba la versión y la información básica de la instancia Jira.",
    {},
    () => safely(() => jira.getServerInfo()),
  );

  server.tool(
    "get_current_user",
    "Devuelve el usuario Jira autenticado por esta conexión.",
    {},
    () => safely(() => jira.getCurrentUser()),
  );

  server.tool(
    "get_fields",
    "Lista los campos Jira disponibles, incluidos sus IDs de custom fields.",
    {},
    () => safely(() => jira.getFields()),
  );

  server.tool(
    "get_attachment",
    "Obtiene metadatos, visualiza imágenes, lee XLSX o extrae texto de PDF y DOCX con límites de seguridad.",
    {
      attachmentId: z.string().min(1),
      mode: z.enum(["metadata", "image", "spreadsheet", "document"]).default("metadata"),
    },
    async ({ attachmentId, mode }) => {
      try {
        const attachment = await jira.getAttachment(attachmentId);
        if (mode === "metadata") return result(attachment);
        if (mode === "spreadsheet") {
          if (!attachment.filename.toLowerCase().endsWith(".xlsx")) {
            return failure(new Error(`El adjunto ${attachment.filename} no es un XLSX`));
          }
          const downloaded = await jira.downloadAttachmentBytes(attachment);
          const workbook = XLSX.read(downloaded.bytes, { type: "buffer", cellDates: true });
          const sheets = Object.fromEntries(
            workbook.SheetNames.map((sheetName) => {
              const sheet = workbook.Sheets[sheetName];
              const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
                header: 1,
                defval: null,
                raw: false,
              });
              return [sheetName, rows.slice(0, 200).map((row) => row.slice(0, 50))];
            }),
          );
          return result({
            filename: attachment.filename,
            mimeType: downloaded.mimeType,
            truncated: true,
            sheets,
          });
        }
        if (mode === "document") {
          const format = supportedDocumentFormat(attachment.filename, attachment.mimeType);
          if (!format) {
            return failure(new Error(`El adjunto ${attachment.filename} no es PDF ni DOCX`));
          }
          const downloaded = await jira.downloadAttachmentBytes(attachment, DOCUMENT_MAX_BYTES);
          const extracted =
            format === "pdf" ? await extractPdf(downloaded.bytes) : await extractDocx(downloaded.bytes);
          return result({
            filename: attachment.filename,
            mimeType: downloaded.mimeType,
            size: attachment.size,
            ...extracted,
          });
        }
        if (!attachment.mimeType.startsWith("image/")) {
          return failure(new Error(`El adjunto ${attachment.filename} no es una imagen (${attachment.mimeType})`));
        }
        const downloaded = await jira.downloadAttachment(attachment);
        return {
          content: [
            {
              type: "image" as const,
              data: downloaded.data,
              mimeType: downloaded.mimeType,
            },
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  id: attachment.id,
                  filename: attachment.filename,
                  mimeType: downloaded.mimeType,
                  size: attachment.size,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "get_issue",
    "Obtiene un ticket por clave, por ejemplo OLA-4021.",
    { issueKey: z.string().min(1), fields: z.array(z.string()).optional() },
    ({ issueKey, fields }) => safely(() => jira.getIssue(issueKey, fields)),
  );

  server.tool(
    "search_issues",
    "Busca tickets con JQL y devuelve resultados paginados.",
    {
      jql: z.string().min(1),
      startAt: z.number().int().min(0).default(0),
      maxResults: z.number().int().min(1).max(100).default(50),
      fields: z.array(z.string()).optional(),
    },
    ({ jql, startAt, maxResults, fields }) => safely(() => jira.searchIssues(jql, startAt, maxResults, fields)),
  );

  server.tool(
    "search_assigned_issues",
    "Busca tickets asignados a un usuario, opcionalmente dentro de un proyecto.",
    {
      username: z.string().min(1).describe("Username Jira; también puede ser currentUser()"),
      projectKey: z.string().optional(),
      extraJql: z.string().optional(),
      startAt: z.number().int().min(0).default(0),
      maxResults: z.number().int().min(1).max(100).default(50),
    },
    ({ username, projectKey, extraJql, startAt, maxResults }) => {
      const clauses = [`assignee = ${username === "currentUser()" ? username : jqlString(username)}`];
      if (projectKey) clauses.unshift(`project = ${jqlString(projectKey)}`);
      if (extraJql?.trim()) clauses.push(`(${extraJql.trim()})`);
      return safely(() => jira.searchIssues(clauses.join(" AND "), startAt, maxResults));
    },
  );

  server.tool(
    "get_comments",
    "Lista los comentarios de un ticket con paginación.",
    {
      issueKey: z.string().min(1),
      startAt: z.number().int().min(0).default(0),
      maxResults: z.number().int().min(1).max(100).default(50),
      orderBy: z.enum(["created", "-created"]).optional(),
    },
    ({ issueKey, startAt, maxResults, orderBy }) =>
      safely(() => jira.getComments(issueKey, startAt, maxResults, orderBy)),
  );

  server.tool(
    "get_transitions",
    "Lista las transiciones disponibles para un ticket según workflow y permisos.",
    { issueKey: z.string().min(1) },
    ({ issueKey }) => safely(() => jira.getTransitions(issueKey)),
  );
}
