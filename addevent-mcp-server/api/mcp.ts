import type { IncomingMessage, ServerResponse } from "http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildServer } from "../src/server.js";

/**
 * Vercel serverless function handling the MCP Streamable HTTP transport at
 * POST /api/mcp. A new server + transport is created per invocation
 * (stateless), matching Vercel's per-request execution model and avoiding
 * request ID collisions across concurrent callers.
 *
 * Vercel parses JSON request bodies automatically for application/json
 * requests, so req.body arrives already parsed -- no body-parser needed
 * here (unlike the Express version in src/index.ts).
 */
export default async function handler(
  req: IncomingMessage & { method?: string; body?: unknown },
  res: ServerResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed. This endpoint only accepts POST." }));
    return;
  }

  if (!process.env.ADDEVENT_API_KEY) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      error: "Server misconfigured: ADDEVENT_API_KEY is not set. Add it under Vercel Project Settings > Environment Variables, then redeploy."
    }));
    return;
  }

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
}
