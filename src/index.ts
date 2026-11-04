#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createDependencies, createMcpServer } from "./container.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const server = createMcpServer(createDependencies(config));
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Jira MCP server failed to start: ${message}`);
  process.exitCode = 1;
});
