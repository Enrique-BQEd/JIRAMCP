import { describe, expect, it, vi } from "vitest";
import { JiraApiError, JiraClient } from "../src/jira-client.js";
import { failure } from "../src/tools/common.js";

describe("JiraClient", () => {
  it("builds the REST v2 URL and query parameters", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ issues: [] }), { status: 200 }),
    );
    const client = new JiraClient({
      baseUrl: "https://jira.example.com",
      username: "user",
      password: "secret",
      timeoutMs: 1000,
    });

    await client.searchIssues('project = "OLA"', 10, 20, ["summary"]);
    const [request] = fetchMock.mock.calls;
    expect(String(request[0])).toContain("/rest/api/2/search?");
    expect(String(request[0])).toContain("startAt=10");
    expect(String(request[0])).toContain("maxResults=20");
    expect(String(request[0])).toContain("jql=project+%3D+%22OLA%22");
    expect((request[1] as RequestInit).headers).toMatchObject({ Accept: "application/json" });
    fetchMock.mockRestore();
  });

  it("normalizes Jira API errors", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ errorMessages: ["Issue not found"] }), { status: 404 }),
    );
    const client = new JiraClient({
      baseUrl: "https://jira.example.com",
      username: "user",
      password: "secret",
      timeoutMs: 1000,
    });

    await expect(client.getIssue("OLA-404")).rejects.toMatchObject<JiraApiError>({
      status: 404,
      message: "Issue not found",
    });
    fetchMock.mockRestore();
  });

  it("includes field errors when errorMessages is empty", async () => {
    const payload = {
      errorMessages: [],
      errors: { issuetype: "valid issue type is required", project: "project is required" },
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 400 }),
    );
    const client = new JiraClient({
      baseUrl: "https://jira.example.com",
      username: "user",
      password: "secret",
      timeoutMs: 1000,
    });

    await expect(client.createIssue({ summary: "x" })).rejects.toMatchObject({
      status: 400,
      message: "issuetype: valid issue type is required; project: project is required",
      details: payload,
    });
    fetchMock.mockRestore();
  });

  it("createSubtask resolves project and a valid subtask type from the parent", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/issue/OLA-4021")) {
        return new Response(
          JSON.stringify({ key: "OLA-4021", fields: { project: { key: "OLA", id: "35600" } } }),
          { status: 200 },
        );
      }
      if (url.includes("/project/OLA")) {
        return new Response(
          JSON.stringify({
            key: "OLA",
            issueTypes: [
              { id: "3", name: "Task", subtask: false },
              { id: "5", name: "Epic", subtask: false },
              { id: "7", name: "Technical task", subtask: true },
              { id: "27102", name: "Sub-bug", subtask: true },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.endsWith("/issue")) {
        return new Response(JSON.stringify({ key: "OLA-9999", id: "1" }), { status: 201 });
      }
      return new Response(JSON.stringify({ errorMessages: [`Unexpected URL ${url}`] }), { status: 500 });
    });

    const client = new JiraClient({
      baseUrl: "https://jira.example.com",
      username: "user",
      password: "secret",
      timeoutMs: 1000,
    });

    await client.createSubtask("OLA-4021", {
      summary: "Procesamiento por batches de tickets",
      description: "Batches de hasta 100 filas",
    });

    const createCall = fetchMock.mock.calls.find(([requestUrl]) => String(requestUrl).endsWith("/issue"));
    expect(createCall).toBeDefined();
    const body = JSON.parse(String((createCall?.[1] as RequestInit).body));
    expect(body).toEqual({
      fields: {
        summary: "Procesamiento por batches de tickets",
        description: "Batches de hasta 100 filas",
        project: { key: "OLA" },
        issuetype: { id: "7", name: "Technical task" },
        parent: { key: "OLA-4021" },
      },
    });
    fetchMock.mockRestore();
  });
});

describe("failure", () => {
  it("returns Jira details so field errors reach the chat", () => {
    const result = failure(
      new JiraApiError("issuetype: valid issue type is required", 400, {
        errorMessages: [],
        errors: { issuetype: "valid issue type is required" },
      }),
    );

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text)).toEqual({
      message: "issuetype: valid issue type is required",
      status: 400,
      details: {
        errorMessages: [],
        errors: { issuetype: "valid issue type is required" },
      },
    });
  });
});
