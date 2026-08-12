import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { addEventRequest, handleApiError } from "../services/addevent-client.js";
import { formatJson, extractArray } from "../format.js";
import { CHARACTER_LIMIT } from "../constants.js";
import type { AddEventTimezone } from "../types.js";

const ListTimezonesInputSchema = z.object({
  search: z.string()
    .optional()
    .describe("Optional case-insensitive filter, matched against the timezone name (e.g. 'Denver' or 'America/').")
}).strict();

type ListTimezonesInput = z.infer<typeof ListTimezonesInputSchema>;

export function registerTimezoneTools(server: McpServer): void {
  server.registerTool(
    "addevent_list_timezones",
    {
      title: "List AddEvent Timezones",
      description: `Lists the timezone values supported by AddEvent's timezone field on events and calendars.

Args:
  - search (string, optional): Filter results to timezone names containing this text.

Returns: { "timezones": [...], "count": number }

Examples:
  - "What timezone value should I use for Salt Lake City?" -> search: "Denver" (Utah shares the America/Denver zone).
  - Use this before addevent_create_event or addevent_create_calendar if you're unsure of the exact timezone string.`,
      inputSchema: ListTimezonesInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: ListTimezonesInput) => {
      try {
        const data = await addEventRequest<Record<string, unknown>>("/timezones", "GET");
        let timezones = extractArray<AddEventTimezone>(data, "timezones");

        if (params.search) {
          const needle = params.search.toLowerCase();
          timezones = timezones.filter((tz) => tz.timezone?.toLowerCase().includes(needle));
        }

        const output = { timezones, count: timezones.length };
        return {
          content: [{ type: "text" as const, text: formatJson(output, CHARACTER_LIMIT) }],
          structuredContent: output as unknown as Record<string, unknown>
        };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    }
  );
}
