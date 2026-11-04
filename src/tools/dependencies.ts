import type { JiraClient } from "../jira-client.js";
import type { ProjectConfigStore } from "../project-config.js";

export type JiraToolDependencies = {
  jira: JiraClient;
  projectConfig: ProjectConfigStore;
};
