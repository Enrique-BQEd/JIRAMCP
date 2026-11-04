import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const workflowDocumentation = `# Flujo de trabajo de Jira

## Backlog

- No entra nada que no esté definido y validado por cliente.
- El backlog está ordenado y revisado para encontrar problemas de definición.

## Historias

- Las crea diseño.
- Se gestionan en el backlog.
- No tienen prioridad, salvo si están en sprint y el sprint está en riesgo.

## Tareas

- Las crea desarrollo y son tareas técnicas.
- Se gestionan en el backlog.
- El equipo de desarrollo marca la prioridad según la urgencia para mantener la plataforma funcionando.
- Si necesitan testeo debe indicarse en el ticket o comunicarse a QA.
- Si no necesitan testeo pasan a “pending to prod” una vez mergeadas y probadas por desarrollo.

## Bugs

- Los crea QA.
- Los bugs de producción que necesiten prioridad alta entran al backlog de Mantenimiento; los demás entran directamente en sprint.
- Si el sprint está en riesgo, QA habla con PM y TL.
- Se abren dentro de la historia salvo que la historia esté cerrada; no se reabre la historia.
- Llevan prioridad definida por el impacto en el usuario.
- Los bugs indicados por cliente entran en Mantenimiento y llevan el prefijo [ANAYA].
- Los sub-bugs son “minor”; excepcionalmente “trivial”. Una historia no se cierra si tiene sub-bugs, salvo que todos sean trivials y pasen al backlog, comunicándolo a PM y TL.

## Improvements

- Los crea diseño.
- Se modifica la historia padre y se crea una tarea enlazada a ella.
- Las tareas llevan el prefijo [Improvement].
- Se gestionan en el backlog.

## Ubicación de tareas

Al crear una Task, el usuario debe poder indicar:

- **Backlog**: crear la tarea sin asignarla a ningún sprint.
- **Sprint activo**: crearla y añadirla al sprint activo de un tablero concreto.
- **Next**: usar el sprint o tablero configurado como “Next”; nunca asumir un ID sin configuración.
- **Mantenimiento**: usar el proyecto, tablero o sprint de mantenimiento configurado por el equipo; pedir aclaración si hay más de una opción.

Si el usuario no indica una ubicación, pregunta antes de crear la tarea. Si pide sprint activo, usa \`get_active_sprints\` y después \`move_issues_to_active_sprint\`.
`;

const toolDocumentation = `# Tools del Jira MCP

Todas las tools usan la instancia configurada en \`JIRA_BASE_URL\`, la API REST \`/rest/api/2\` y las credenciales del usuario autenticado. Jira aplica siempre sus propios permisos.

## Lectura y consulta

- \`get_server_info\`: consulta versión y datos básicos de la instancia mediante \`GET /serverInfo\`.
- \`get_current_user\`: identifica al usuario autenticado mediante \`GET /myself\`. Úsalo antes de asignar un ticket “a mí”.
- \`get_fields\`: lista los campos Jira y sus IDs; úsala para localizar campos personalizados como Epic Link antes de editarlos.
- \`get_attachment\`: obtiene metadatos, devuelve imágenes de hasta 5 MB como contenido visual MCP, lee XLSX como hojas estructuradas (máximo 200 filas y 50 columnas por hoja) o extrae texto de PDF/DOCX de hasta 10 MB y 500.000 caracteres. Los PDFs escaneados requieren OCR y no se procesan.
- \`get_issue\`: obtiene un ticket por clave mediante \`GET /issue/{issueKey}\`; admite una lista de fields.
- \`search_issues\`: ejecuta una consulta JQL paginada mediante \`GET /search\`.
- \`search_assigned_issues\`: construye JQL con \`assignee\`, proyecto y filtros adicionales, y usa la misma búsqueda paginada. Puede recibir \`currentUser()\`.
- \`get_comments\`: lista comentarios paginados con \`GET /issue/{issueKey}/comment\`.
- \`get_transitions\`: lista únicamente las transiciones permitidas por workflow y permisos mediante \`GET /issue/{issueKey}/transitions\`. Nunca se debe inventar un estado; primero hay que consultar esta tool.
- \`get_active_sprints\`: lista los sprints activos de un tablero mediante \`GET /rest/agile/1.0/board/{boardId}/sprint?state=active\`.
- \`get_project\`: consulta los metadatos de un proyecto mediante \`GET /project/{projectKey}\`.
- \`get_project_versions\`: lista versiones del proyecto mediante \`GET /project/{projectKey}/versions\`.

## Configuración local del MCP

- \`get_project_config\`: lee las preferencias locales del MCP del proyecto.
- \`set_project_config\`: guarda alias, JQL por defecto, fields, board por defecto y destinos como \`next\` o \`maintenance\`. No cambia la configuración administrativa de Jira.

## Escritura y workflow

- \`edit_issue\`: actualiza fields/update mediante \`PUT /issue/{issueKey}\`; solo debe enviar los campos solicitados.
- \`assign_issue\`: asigna o desasigna mediante \`PUT /issue/{issueKey}/assignee\`.
- \`create_issue\`: crea un issue mediante \`POST /issue\`. Requiere \`confirm=true\`.
- \`create_subtask\`: crea una subtarea con parent mediante \`POST /issue\`. Requiere \`confirm=true\`.
- \`transition_issue\`: ejecuta el ID devuelto por \`get_transitions\` mediante \`POST /issue/{issueKey}/transitions\`. Requiere \`confirm=true\`.
- \`move_issues_to_active_sprint\`: descubre el sprint activo del tablero y mueve hasta 50 tickets mediante \`POST /rest/agile/1.0/sprint/{sprintId}/issue\`. Requiere \`confirm=true\`; falla si no hay sprint o hay varios activos.
- \`add_comment\`: añade un comentario mediante \`POST /issue/{issueKey}/comment\`.
- \`update_comment\`: edita un comentario mediante \`PUT /issue/{issueKey}/comment/{commentId}\`.

## Colaboración

- \`link_issues\`: crea un enlace entre issues mediante \`POST /issueLink\`. Requiere \`confirm=true\`.
- \`add_worklog\`: registra tiempo mediante \`POST /issue/{issueKey}/worklog\`.
- \`get_watchers\`: lista watchers mediante \`GET /issue/{issueKey}/watchers\`.
- \`add_watcher\`: añade un watcher. Requiere \`confirm=true\`.
- \`remove_watcher\`: elimina un watcher. Requiere \`confirm=true\`.

## Reglas de seguridad

1. Antes de crear o cambiar un issue, consulta el contexto y los permisos si hay dudas.
2. Antes de mover un issue, consulta \`get_transitions\` y usa el ID exacto.
3. Pide o usa confirmación explícita para crear, enlazar, transicionar o modificar watchers.
4. No borres issues ni cambies configuración administrativa salvo que se añada una tool específica y autorización.
5. No expongas credenciales ni incluyas contraseñas en comentarios o respuestas.
`;

const usageDocumentation = `# Uso recomendado del Jira MCP

## Crear una tarea

1. Determina el proyecto y confirma que el tipo correcto es Task.
2. Pregunta si debe pertenecer a una Epic. Si se proporciona una Epic, localízala por clave y usa el campo Epic Link; consulta \`get_fields\` para encontrar el ID real, porque no es universal entre instancias.
3. Usa un summary claro; aplica prefijos como [Improvement] cuando corresponda.
4. Pregunta dónde colocarla: backlog, sprint activo, Next o Mantenimiento.
5. Si es backlog, no añadas ningún sprint.
6. Si es sprint activo, pide o confirma el board ID, crea la tarea y usa \`get_active_sprints\` seguido de \`move_issues_to_active_sprint\`.
7. Para Next o Mantenimiento, usa únicamente la configuración del proyecto; si no existe, pide el board/sprint exacto y no adivines.
8. Usa \`get_current_user\` si se solicita asignar el ticket al usuario actual.
9. Ejecuta \`create_issue\` con \`confirm=true\` y verifica el ticket creado con \`get_issue\`.
10. Consulta \`get_transitions\` y mueve el ticket solo si el usuario lo ha pedido explícitamente.

## Cambiar estado

1. Llama a \`get_transitions\`.
2. Busca la transición cuyo destino coincida con el estado solicitado.
3. Ejecuta \`transition_issue\` con el ID encontrado y \`confirm=true\`.
4. Comprueba el resultado con \`get_issue\`.

## Buscar trabajo del usuario

Usa \`search_assigned_issues\` con \`username: "currentUser()"\`. Para un proyecto concreto añade \`projectKey\`; para condiciones adicionales usa \`extraJql\`.
`;

export function registerDocumentationResources(server: McpServer): void {
  server.registerResource(
    "jira-workflow",
    "jira://documentation/workflow",
    {
      title: "Jira workflow conventions",
      description: "Reglas internas para backlog, historias, tareas, bugs e improvements.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: workflowDocumentation }],
    }),
  );

  server.registerResource(
    "jira-tools",
    "jira://documentation/tools",
    {
      title: "Jira MCP tools reference",
      description: "Descripción de cada tool, endpoint REST usado, entradas y reglas de seguridad.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: toolDocumentation }],
    }),
  );

  server.registerResource(
    "jira-usage",
    "jira://documentation/usage",
    {
      title: "Jira MCP usage guide",
      description: "Procedimientos recomendados para crear tickets, buscar trabajo y cambiar estados.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: usageDocumentation }],
    }),
  );
}
