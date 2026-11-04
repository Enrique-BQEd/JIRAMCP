import "dotenv/config";

export type JiraConfig = {
  baseUrl: string;
  username: string;
  password: string;
  timeoutMs: number;
  projectConfigPath: string;
  allowedProjects: string[];
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): JiraConfig {
  const baseUrl = required("JIRA_BASE_URL").replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("JIRA_BASE_URL must be a valid URL");
  }
  if (parsed.protocol !== "https:" && process.env.JIRA_ALLOW_HTTP !== "true") {
    throw new Error("JIRA_BASE_URL must use HTTPS (set JIRA_ALLOW_HTTP=true only for local testing)");
  }

  const timeoutMs = Number(process.env.JIRA_TIMEOUT_MS ?? "15000");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) {
    throw new Error("JIRA_TIMEOUT_MS must be an integer between 1000 and 120000");
  }

  return {
    baseUrl,
    username: required("JIRA_USERNAME"),
    password: required("JIRA_PASSWORD"),
    timeoutMs,
    projectConfigPath: process.env.PROJECT_CONFIG_PATH?.trim() || ".jira-mcp-projects.json",
    allowedProjects: (process.env.ALLOWED_PROJECTS ?? "")
      .split(",")
      .map((project) => project.trim().toUpperCase())
      .filter(Boolean),
  };
}
