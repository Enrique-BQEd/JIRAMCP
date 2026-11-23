#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const entry = join(root, "dist", "index.js");

function ensureBuilt() {
  if (existsSync(entry)) {
    return;
  }

  const require = createRequire(import.meta.url);
  let tscBin;
  try {
    tscBin = require.resolve("typescript/bin/tsc");
  } catch {
    console.error(
      "Jira MCP: dist/ missing and typescript is not installed. Run: npm install && npm run build",
    );
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [tscBin, "-p", root], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0 || !existsSync(entry)) {
    console.error("Jira MCP: failed to compile TypeScript before start.");
    process.exit(result.status ?? 1);
  }
}

ensureBuilt();
await import(pathToFileURL(entry).href);
