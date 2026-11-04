import { describe, expect, it, vi } from "vitest";
import { JiraApiError, JiraClient } from "../src/jira-client.js";

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
});
