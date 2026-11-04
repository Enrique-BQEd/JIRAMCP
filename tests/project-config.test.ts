import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ProjectConfigStore } from "../src/project-config.js";

describe("ProjectConfigStore", () => {
  it("writes and reads project preferences", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jira-mcp-"));
    const path = join(directory, "projects.json");
    const store = new ProjectConfigStore(path);

    await store.set("ola", {
      alias: "Operaciones",
      jqlDefault: "project = OLA",
      fields: ["summary", "status", "summary"],
    });

    await expect(store.get("OLA")).resolves.toEqual({
      projectKey: "OLA",
      alias: "Operaciones",
      jqlDefault: "project = OLA",
      fields: ["summary", "status"],
    });
    await expect(readFile(path, "utf8")).resolves.toContain('"OLA"');
  });

  it("rejects projects outside the allow-list", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jira-mcp-"));
    const store = new ProjectConfigStore(join(directory, "projects.json"), ["OLA"]);
    await expect(store.get("ABC")).rejects.toThrow("not allowed");
  });
});
