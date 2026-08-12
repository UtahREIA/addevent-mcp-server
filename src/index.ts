#!/usr/bin/env node
/**
 * AddEvent MCP Server entry point.
 *
 * Two ways to run this:
 *   - stdio (default): for Claude Desktop / local MCP clients that launch
 *     this as a subprocess. Run with `npm start` or `node dist/index.js`.
 *   - streamable HTTP: for remote hosting (e.g. Vercel). Run with
 *     `TRANSPORT=http npm start`. Vercel deployments use api/mcp.ts
 *     instead of this file, but this mode is useful for testing the HTTP
 *     transport locally before deploying.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { buildServer } from "./server.js";

function requireApiKey(): void {
  if (!process.env.ADDEVENT_API_KEY) {
    console.error(
      "ERROR: ADDEVENT_API_KEY environment variable is required. " +
      "Copy .env.example to .env and set it to the API token from " +
      "Settings > API in your AddEvent dashboard."
    );
    process.exit(1);
  }
}

async function runStdio(): Promise<void> {
  requireApiKey();
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AddEvent MCP server running via stdio");
}

async function runHTTP(): Promise<void> {
  requireApiKey();
  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req, res) => {
    // A new server + transport per request keeps this stateless, which
    // avoids request ID collisions across concurrent callers.
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT || "3000", 10);
  app.listen(port, () => {
    console.error(`AddEvent MCP server running on http://localhost:${port}/mcp`);
  });
}

const transport = process.env.TRANSPORT || "stdio";
if (transport === "http") {
  runHTTP().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
} else {
  runStdio().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
