# Jira MCP Server

Servidor MCP local para Jira Server/Data Center 7.12 mediante REST API v2. El transporte inicial es `stdio`, por lo que cada persona lo ejecuta con sus propias credenciales y permisos de Jira.

## Requisitos

- Node.js 20 o superior.
- Acceso HTTPS a la instancia Jira.
- Usuario Jira con permisos suficientes para las operaciones que vaya a realizar.

## Instalación

```bash
npm install
cp .env.example .env
```

Edita `.env` con la URL y credenciales de tu usuario. La URL debe ser la raíz de Jira:

```text
JIRA_BASE_URL=https://jira.bqeducacion.cc
```

No añadas `/rest/api/2` a `JIRA_BASE_URL`; el cliente lo incorpora automáticamente.

## Ejecutar y compilar

```bash
npm run build
npm start
```

Para desarrollo:

```bash
npm run dev
```

## Configuración en un cliente MCP

Ejemplo genérico de configuración local:

```json
{
  "mcpServers": {
    "jira-bq": {
      "command": "node",
      "args": ["/ruta/absoluta/JIRAMCP/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://jira.bqeducacion.cc",
        "JIRA_USERNAME": "tu-usuario",
        "JIRA_PASSWORD": "tu-contraseña"
      }
    }
  }
}
```

Es preferible que el cliente lea las credenciales desde un gestor de secretos o desde un `.env` con permisos restringidos. Las credenciales nunca se escriben en las respuestas de las herramientas.

## Herramientas principales

- Lectura: `get_issue`, `search_issues`, `search_assigned_issues`, `get_comments`, `get_attachment`, `get_transitions`, `get_project`, `get_project_versions`.
- Usuario y diagnóstico: `get_current_user`, `get_server_info`.
- Preferencias locales: `get_project_config`, `set_project_config`.
- Edición y workflow: `edit_issue`, `assign_issue`, `transition_issue`, `get_active_sprints`, `move_issues_to_active_sprint`, `add_comment`, `update_comment`.
- Trabajo relacionado: `create_issue`, `create_subtask`, `link_issues`, `add_worklog`, `get_watchers`, `add_watcher`, `remove_watcher`.

`get_attachment` admite `metadata`, `image`, `spreadsheet` y `document`. El modo `spreadsheet` descarga un XLSX y devuelve sus hojas en formato estructurado, limitado a 200 filas y 50 columnas por hoja. El modo `document` extrae texto de PDF y DOCX de hasta 10 MB, con una salida máxima de 500.000 caracteres. Los PDFs escaneados requieren OCR y no se procesan.

Los extractores procesan archivos obtenidos desde Jira; se aplican límites de tamaño y de salida. Conviene revisar `npm audit` antes de desplegar esta funcionalidad en producción y no ejecutar `npm audit fix --force` sin validar compatibilidad.

Las operaciones de creación, transición, enlaces y watchers requieren `confirm=true` como protección adicional. Jira sigue aplicando sus propios permisos.

Las herramientas están separadas por dominio en `src/tools/` y se registran mediante inyección de dependencias:

- `read.ts`: consultas, JQL, comentarios y transiciones disponibles.
- `projects.ts`: metadatos y preferencias locales de proyecto.
- `issues.ts`: edición, asignación y creación.
- `workflow.ts`: transiciones.
- `comments.ts`: alta y edición de comentarios.
- `collaboration.ts`: enlaces, worklogs y watchers.
- `container.ts`: construye las dependencias (`JiraClient`, `ProjectConfigStore`) y el `McpServer`.

## Recursos y skills MCP

El servidor publica recursos de solo lectura para que el LLM pueda consultar la documentación sin acceder al sistema de archivos:

- `jira://documentation/workflow`: convenciones internas para backlog, historias, tareas, bugs e improvements.
- `jira://documentation/tools`: referencia de cada tool, endpoint REST, entradas y reglas de seguridad.
- `jira://documentation/usage`: procedimientos recomendados para crear tickets, buscar trabajo y cambiar estados.

En MCP, las “skills” se exponen como prompts reutilizables:

- `jira_workflow_advisor`: clasifica y gestiona trabajo según las reglas internas.
- `jira_create_task`: guía la creación de tareas técnicas.
- `jira_update_workflow`: cambia estados usando las transiciones reales de Jira.
- `jira_my_work`: busca y resume los tickets asignados al usuario actual.

Los prompts orientan al LLM, pero no sustituyen los permisos de Jira ni la confirmación requerida por las tools.

## JQL de asignaciones

`search_assigned_issues` genera consultas como:

```text
project = "OLA" AND assignee = "usuario"
```

También acepta `currentUser()` y un fragmento adicional de JQL.

## Configuración por proyecto

`set_project_config` guarda preferencias del MCP en `.jira-mcp-projects.json`, ignorado por git:

```json
{
  "OLA": {
    "alias": "Operaciones",
    "jqlDefault": "project = OLA ORDER BY updated DESC",
    "fields": ["summary", "status", "assignee", "priority"],
    "allowed": true,
    "boardId": 48,
    "destinations": {
      "next": { "boardId": 48, "sprintName": "Next" },
      "maintenance": { "boardId": 48, "sprintName": "Mantenimiento" }
    }
  }
}
```

Los destinos son referencias para decidir dónde colocar tickets; si `sprintName` no es único o no existe, el MCP pedirá el sprint exacto. Esto no cambia la configuración administrativa del proyecto Jira.

## Comprobaciones

```bash
npm run typecheck
npm test
```

La fase HTTPS multiusuario requiere añadir autenticación del propio MCP, aislamiento de credenciales, auditoría, rate limiting y TLS antes de exponerlo fuera de la máquina local.
