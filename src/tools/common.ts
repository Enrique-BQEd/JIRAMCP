import { JiraApiError } from "../jira-client.js";

export type ToolResult = {
  content: [{ type: "text"; text: string }];
  isError?: boolean;
};

export function result(value: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value ?? null, null, 2) }] };
}

export function failure(error: unknown): ToolResult {
  const message =
    error instanceof JiraApiError
      ? `${error.message}${error.status ? ` (HTTP ${error.status})` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);
  return { content: [{ type: "text", text: message }], isError: true };
}

export function safely<TArgs extends unknown[]>(
  operation: (...args: TArgs) => Promise<unknown>,
  ...args: TArgs
): Promise<ToolResult> {
  return operation(...args).then(result).catch(failure);
}

export function jqlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
