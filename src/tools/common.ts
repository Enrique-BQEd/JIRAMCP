import { JiraApiError } from "../jira-client.js";

export type ToolResult = {
  content: [{ type: "text"; text: string }];
  isError?: boolean;
};

export function result(value: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value ?? null, null, 2) }] };
}

export function failure(error: unknown): ToolResult {
  if (error instanceof JiraApiError) {
    const payload =
      error.details === undefined
        ? { message: error.message, status: error.status }
        : { message: error.message, status: error.status, details: error.details };
    return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }], isError: true };
  }

  const message = error instanceof Error ? error.message : String(error);
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
