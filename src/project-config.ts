import { access, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";

export type ProjectPreferences = {
  alias?: string;
  jqlDefault?: string;
  fields?: string[];
  allowed?: boolean;
  boardId?: number;
  destinations?: Record<string, {
    boardId?: number;
    sprintId?: number;
    sprintName?: string;
  }>;
};

export type ProjectConfigFile = Record<string, ProjectPreferences>;

export class ProjectConfigStore {
  private readonly path: string;

  constructor(path: string, private readonly allowedProjects: string[] = []) {
    this.path = resolve(path);
  }

  private validateProject(projectKey: string): string {
    const key = projectKey.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9_-]{1,49}$/.test(key)) {
      throw new Error("projectKey must contain 2-50 letters, numbers, underscores or hyphens");
    }
    if (this.allowedProjects.length && !this.allowedProjects.includes(key)) {
      throw new Error(`Project ${key} is not allowed by ALLOWED_PROJECTS`);
    }
    return key;
  }

  private async read(): Promise<ProjectConfigFile> {
    try {
      return JSON.parse(await readFile(this.path, "utf8")) as ProjectConfigFile;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw new Error(`Could not read project config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async get(projectKey: string): Promise<ProjectPreferences & { projectKey: string }> {
    const key = this.validateProject(projectKey);
    const config = await this.read();
    return { projectKey: key, ...(config[key] ?? {}) };
  }

  async set(projectKey: string, preferences: ProjectPreferences): Promise<ProjectPreferences & { projectKey: string }> {
    const key = this.validateProject(projectKey);
    if (preferences.fields && preferences.fields.some((field) => !/^[A-Za-z0-9_.-]+$/.test(field))) {
      throw new Error("fields must contain Jira field names only");
    }
    const config = await this.read();
    config[key] = {
      ...(config[key] ?? {}),
      ...preferences,
      ...(preferences.fields ? { fields: [...new Set(preferences.fields)] } : {}),
    };
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
    return { projectKey: key, ...config[key] };
  }

  async exists(): Promise<boolean> {
    try {
      await access(this.path);
      return true;
    } catch {
      return false;
    }
  }
}
