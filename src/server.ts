import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerEventTools } from "./tools/events.js";
import { registerCalendarTools } from "./tools/calendars.js";
import { registerRsvpTools } from "./tools/rsvps.js";
import { registerTimezoneTools } from "./tools/timezones.js";

/**
 * Builds a fully configured McpServer instance with every AddEvent tool
 * registered. Used by both the stdio entry point (src/index.ts, for local/
 * Claude Desktop use) and the HTTP entry point (api/mcp.ts, for Vercel).
 */
export function buildServer(): McpServer {
  const server = new McpServer({
    name: "addevent-mcp-server",
    version: "1.0.0"
  });

  registerEventTools(server);
  registerCalendarTools(server);
  registerRsvpTools(server);
  registerTimezoneTools(server);

  return server;
}
