export type JiraResponse<T> = T;

export type JiraSprint = {
  id: number;
  name: string;
  state: "future" | "active" | "closed" | string;
  startDate?: string;
  endDate?: string;
  originBoardId?: number;
};

export type JiraSprintPage = {
  values: JiraSprint[];
  isLast?: boolean;
};

export type JiraAttachment = {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail?: string;
};

export class JiraApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "JiraApiError";
  }
}

export type JiraClientOptions = {
  baseUrl: string;
  username: string;
  password: string;
  timeoutMs: number;
};

export class JiraClient {
  private readonly authHeader: string;

  constructor(private readonly options: JiraClientOptions) {
    this.authHeader = `Basic ${Buffer.from(`${options.username}:${options.password}`).toString("base64")}`;
  }

  async request<T>(
    method: string,
    path: string,
    options: { query?: Record<string, string | number | undefined>; body?: unknown } = {},
  ): Promise<T> {
    const url = new URL(`${this.options.baseUrl}/rest/api/2${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          Authorization: this.authHeader,
          ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
      const text = await response.text();
      let payload: unknown = undefined;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = text;
        }
      }
      if (!response.ok) {
        const message =
          typeof payload === "object" && payload !== null && "errorMessages" in payload
            ? (payload as { errorMessages?: string[] }).errorMessages?.join("; ")
            : undefined;
        throw new JiraApiError(message || `Jira API request failed with status ${response.status}`, response.status, payload);
      }
      return payload as T;
    } catch (error) {
      if (error instanceof JiraApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new JiraApiError(`Jira request timed out after ${this.options.timeoutMs}ms`, 408);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async requestAgile<T>(
    method: string,
    path: string,
    options: { query?: Record<string, string | number | undefined>; body?: unknown } = {},
  ): Promise<T> {
    const url = new URL(`${this.options.baseUrl}/rest/agile/1.0${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          Authorization: this.authHeader,
          ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
      const text = await response.text();
      let payload: unknown = undefined;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = text;
        }
      }
      if (!response.ok) {
        const message =
          typeof payload === "object" && payload !== null && "errorMessages" in payload
            ? (payload as { errorMessages?: string[] }).errorMessages?.join("; ")
            : undefined;
        throw new JiraApiError(
          message || `Jira Agile API request failed with status ${response.status}`,
          response.status,
          payload,
        );
      }
      return payload as T;
    } catch (error) {
      if (error instanceof JiraApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new JiraApiError(`Jira Agile request timed out after ${this.options.timeoutMs}ms`, 408);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  getIssue(issueKey: string, fields?: string[]) {
    return this.request("GET", `/issue/${encodeURIComponent(issueKey)}`, {
      query: fields?.length ? { fields: fields.join(",") } : undefined,
    });
  }

  searchIssues(jql: string, startAt = 0, maxResults = 50, fields?: string[]) {
    return this.request("GET", "/search", {
      query: { jql, startAt, maxResults, fields: fields?.join(",") },
    });
  }

  getTransitions(issueKey: string) {
    return this.request("GET", `/issue/${encodeURIComponent(issueKey)}/transitions`);
  }

  editIssue(issueKey: string, fields: Record<string, unknown>, update?: Record<string, unknown>) {
    return this.request("PUT", `/issue/${encodeURIComponent(issueKey)}`, {
      body: { fields, ...(update ? { update } : {}) },
    });
  }

  transitionIssue(issueKey: string, transitionId: string, fields?: Record<string, unknown>) {
    return this.request("POST", `/issue/${encodeURIComponent(issueKey)}/transitions`, {
      body: { transition: { id: transitionId }, ...(fields ? { fields } : {}) },
    });
  }

  addComment(issueKey: string, body: string, visibility?: { type: "role" | "group"; value: string }) {
    return this.request("POST", `/issue/${encodeURIComponent(issueKey)}/comment`, {
      body: { body, ...(visibility ? { visibility } : {}) },
    });
  }

  getComments(issueKey: string, startAt = 0, maxResults = 50, orderBy?: "created" | "-created") {
    return this.request("GET", `/issue/${encodeURIComponent(issueKey)}/comment`, {
      query: { startAt, maxResults, orderBy },
    });
  }

  updateComment(issueKey: string, commentId: string, body: string) {
    return this.request("PUT", `/issue/${encodeURIComponent(issueKey)}/comment/${encodeURIComponent(commentId)}`, {
      body: { body },
    });
  }

  assignIssue(issueKey: string, username: string | null) {
    return this.request("PUT", `/issue/${encodeURIComponent(issueKey)}/assignee`, {
      body: { name: username },
    });
  }

  getProject(projectKey: string) {
    return this.request("GET", `/project/${encodeURIComponent(projectKey)}`);
  }

  createIssue(fields: Record<string, unknown>) {
    return this.request("POST", "/issue", { body: { fields } });
  }

  createSubtask(parentKey: string, fields: Record<string, unknown>) {
    return this.createIssue({ ...fields, issuetype: fields.issuetype ?? { name: "Sub-task" }, parent: { key: parentKey } });
  }

  linkIssues(linkType: string, inwardIssue: string, outwardIssue: string, comment?: string) {
    return this.request("POST", "/issueLink", {
      body: {
        type: { name: linkType },
        inwardIssue: { key: inwardIssue },
        outwardIssue: { key: outwardIssue },
        ...(comment ? { comment: { body: comment } } : {}),
      },
    });
  }

  addWorklog(issueKey: string, timeSpent: string, comment?: string, started?: string) {
    return this.request("POST", `/issue/${encodeURIComponent(issueKey)}/worklog`, {
      body: { timeSpent, ...(comment ? { comment } : {}), ...(started ? { started } : {}) },
    });
  }

  getWatchers(issueKey: string) {
    return this.request("GET", `/issue/${encodeURIComponent(issueKey)}/watchers`);
  }

  addWatcher(issueKey: string, username: string) {
    return this.request("POST", `/issue/${encodeURIComponent(issueKey)}/watchers`, { body: username });
  }

  removeWatcher(issueKey: string, username: string) {
    return this.request("DELETE", `/issue/${encodeURIComponent(issueKey)}/watchers`, { query: { username } });
  }

  getVersions(projectKey: string) {
    return this.request("GET", `/project/${encodeURIComponent(projectKey)}/versions`);
  }

  getActiveSprints(boardId: number): Promise<JiraSprintPage> {
    return this.requestAgile("GET", `/board/${boardId}/sprint`, { query: { state: "active" } });
  }

  moveIssuesToSprint(sprintId: number, issueKeys: string[]) {
    return this.requestAgile("POST", `/sprint/${sprintId}/issue`, {
      body: { issues: issueKeys },
    });
  }

  getServerInfo() {
    return this.request("GET", "/serverInfo");
  }

  getCurrentUser() {
    return this.request("GET", "/myself");
  }

  getFields() {
    return this.request("GET", "/field");
  }

  getAttachment(attachmentId: string): Promise<JiraAttachment> {
    return this.request("GET", `/attachment/${encodeURIComponent(attachmentId)}`);
  }

  async downloadAttachmentBytes(
    attachment: JiraAttachment,
    maxBytes = 5 * 1024 * 1024,
  ): Promise<{ bytes: Buffer; mimeType: string }> {
    if (attachment.size > maxBytes) {
      throw new JiraApiError(
        `Attachment ${attachment.filename} is too large (${attachment.size} bytes; maximum ${maxBytes})`,
        413,
      );
    }
    const attachmentUrl = new URL(attachment.content);
    const secureUrl = new URL(`${attachmentUrl.pathname}${attachmentUrl.search}`, this.options.baseUrl);
    const response = await fetch(secureUrl, {
      headers: { Authorization: this.authHeader },
    });
    if (!response.ok) {
      throw new JiraApiError(`Attachment download failed with status ${response.status}`, response.status);
    }
    const responseMimeType = response.headers.get("content-type")?.split(";")[0] || attachment.mimeType;
    if (responseMimeType === "text/html") {
      throw new JiraApiError("Jira returned an HTML login page instead of the attachment", 401);
    }
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > maxBytes) {
      throw new JiraApiError(`Attachment exceeds the maximum size of ${maxBytes} bytes`, 413);
    }
    return {
      bytes: Buffer.from(bytes),
      mimeType: responseMimeType,
    };
  }

  async downloadAttachment(
    attachment: JiraAttachment,
    maxBytes = 5 * 1024 * 1024,
  ): Promise<{ data: string; mimeType: string }> {
    const downloaded = await this.downloadAttachmentBytes(attachment, maxBytes);
    return {
      data: downloaded.bytes.toString("base64"),
      mimeType: downloaded.mimeType,
    };
  }
}
