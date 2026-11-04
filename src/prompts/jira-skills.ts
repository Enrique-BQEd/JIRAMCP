import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

type PromptMessage = {
  role: "user" | "assistant";
  content: { type: "text"; text: string };
};

function prompt(text: string): { messages: PromptMessage[] } {
  return { messages: [{ role: "user", content: { type: "text", text } }] };
}

export function registerJiraSkills(server: McpServer): void {
  server.registerPrompt(
    "jira_workflow_advisor",
    {
      title: "Jira workflow advisor",
      description: "Aplica las convenciones internas de Jira para clasificar y gestionar trabajo.",
    },
    async () =>
      prompt(`Actúa como asesor del workflow interno de Jira.

Lee primero los recursos jira://documentation/workflow, jira://documentation/tools y jira://documentation/usage.
Antes de crear o modificar un ticket, identifica si es historia, tarea, bug o improvement según esas reglas.
No cambies estados sin consultar get_transitions y no ejecutes operaciones destructivas sin confirmación explícita.
Explica brevemente qué regla has aplicado y usa las tools Jira solo cuando la petición del usuario lo requiera.`),
  );

  server.registerPrompt(
    "jira_create_task",
    {
      title: "Create Jira task",
      description: "Guía la creación de una tarea técnica conforme al workflow del equipo.",
      argsSchema: {
        projectKey: z.string().describe("Clave del proyecto Jira"),
        summary: z.string().describe("Summary de la tarea"),
        assignee: z.string().optional().describe("Username o currentUser()"),
        epicKey: z.string().optional().describe("Clave de la Epic, por ejemplo OLA-4180"),
        placement: z
          .enum(["backlog", "active_sprint", "next", "maintenance"])
          .optional()
          .describe("Dónde colocar la tarea"),
        boardId: z.number().int().positive().optional().describe("Board necesario para sprint activo"),
      },
    },
    async ({ projectKey, summary, assignee, epicKey, placement, boardId }) =>
      prompt(`Crea una tarea técnica en Jira siguiendo estas instrucciones:

1. Lee jira://documentation/workflow y jira://documentation/tools.
2. Verifica que el tipo sea Task y que el summary sea claro.
3. Usa el proyecto ${projectKey} y el summary ${JSON.stringify(summary)}.
4. Epic solicitada: ${epicKey ?? "ninguna"}. Si existe, valida que sea una Epic y usa get_fields para localizar el campo Epic Link antes de editarlo.
5. Ubicación solicitada: ${placement ?? "no indicada"}. Si no está indicada, pregunta antes de crear.
6. Para backlog, crea la tarea sin sprint.
7. Para active_sprint, necesitas el board ID ${boardId ?? "no proporcionado"}; usa get_active_sprints y después move_issues_to_active_sprint.
8. Para next o maintenance, usa la configuración del proyecto; si falta, solicita el board o sprint exacto y no adivines.
9. Si la asignación solicitada es currentUser(), consulta primero get_current_user. Usuario solicitado: ${assignee ?? "sin asignación"}.
10. Llama a create_issue únicamente con confirm=true.
11. No la muevas de estado salvo que el usuario lo pida explícitamente; si lo pide, consulta antes get_transitions.

Informa de la clave creada y del estado final.`),
  );

  server.registerPrompt(
    "jira_update_workflow",
    {
      title: "Update Jira workflow",
      description: "Mueve un ticket usando únicamente las transiciones permitidas por Jira.",
      argsSchema: {
        issueKey: z.string().describe("Clave del ticket"),
        targetStatus: z.string().describe("Estado destino solicitado"),
      },
    },
    async ({ issueKey, targetStatus }) =>
      prompt(`Mueve ${issueKey} al estado solicitado: ${targetStatus}.

Lee jira://documentation/tools y jira://documentation/usage.
Consulta get_transitions para ${issueKey}; no inventes un transitionId.
Si existe una transición cuyo destino coincida con ${JSON.stringify(targetStatus)}, ejecútala con confirm=true.
Si no existe, explica qué transiciones están disponibles y no fuerces el cambio.
Verifica el estado final con get_issue.`),
  );

  server.registerPrompt(
    "jira_my_work",
    {
      title: "Show my Jira work",
      description: "Busca y resume los tickets asignados al usuario autenticado.",
      argsSchema: {
        projectKey: z.string().optional().describe("Proyecto opcional"),
        extraJql: z.string().optional().describe("Filtro JQL adicional"),
      },
    },
    async ({ projectKey, extraJql }) =>
      prompt(`Resume mi trabajo actual en Jira.

Usa search_assigned_issues con username "currentUser()".
Proyecto: ${projectKey ?? "todos"}.
Filtro adicional: ${extraJql ?? "ninguno"}.
Agrupa los resultados por estado e incluye clave, summary y prioridad si está disponible.
No modifiques ningún ticket.`),
  );
}
