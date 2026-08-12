import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { addEventRequest, handleApiError } from "../services/addevent-client.js";
import { formatJson, extractArray } from "../format.js";
import { CHARACTER_LIMIT } from "../constants.js";
import type { AddEventCalendar } from "../types.js";
import {
  CreateCalendarInputSchema,
  UpdateCalendarInputSchema,
  GetCalendarInputSchema,
  DeleteCalendarInputSchema,
  SearchCalendarsInputSchema,
  type CreateCalendarInput,
  type UpdateCalendarInput,
  type GetCalendarInput,
  type DeleteCalendarInput,
  type SearchCalendarsInput
} from "../schemas/calendars.js";

export function registerCalendarTools(server: McpServer): void {
  server.registerTool(
    "addevent_create_calendar",
    {
      title: "Create AddEvent Calendar",
      description: `Creates a new calendar (a container that events live inside).

Args:
  - title (string, required): The calendar's title.
  - timezone, weekday_begin, description, internal_name, calendar_color, landing_page_template_id, embeddable_calendar_template_id, custom_data: optional fields.

Returns: The created calendar object as JSON, including its calendar_id.

Examples:
  - "Set up a separate calendar for the WREIA meetups" -> title: "WREIA Meetups".
  - Don't use when: you just need to add an event to an existing calendar (use addevent_create_event with calendar_id instead).

Error Handling:
  - Returns "Error: Invalid request..." (400) if title is missing.`,
      inputSchema: CreateCalendarInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params: CreateCalendarInput) => {
      try {
        const calendar = await addEventRequest<AddEventCalendar>("/calendars", "POST", params);
        const summary = `Created calendar "${calendar.title}" (calendar_id: ${calendar.calendar_id})`;
        return {
          content: [{ type: "text" as const, text: `${summary}\n\n${formatJson(calendar, CHARACTER_LIMIT)}` }],
          structuredContent: calendar as unknown as Record<string, unknown>
        };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    }
  );

  server.registerTool(
    "addevent_search_calendars",
    {
      title: "Search AddEvent Calendars",
      description: `Searches calendars you've previously created. Does NOT create or modify calendars.

Args:
  - calendar_ids (string[], optional): Narrow to specific calendar IDs.
  - page (number, default 1), page_size (number, 1-20, default 10): Pagination.
  - sort_by ('created' | 'title'), sort_order ('asc' | 'desc'): Sorting.

Returns:
  {
    "calendars": [ ...calendar objects... ],
    "count": number,
    "page": number,
    "page_size": number
  }
  An empty "calendars" array means no matches, not an error.

Examples:
  - "What calendars do we have set up?" -> call with no filters to list them all.
  - "Find the calendar_id for the WREIA calendar" -> useful before addevent_create_event.

Error Handling:
  - Returns "Error: Invalid request..." (400) for an invalid sort combination.`,
      inputSchema: SearchCalendarsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: SearchCalendarsInput) => {
      try {
        const { calendar_ids, ...rest } = params;
        const queryParams: Record<string, unknown> = {
          ...rest,
          ...(calendar_ids ? { calendar_ids: calendar_ids.join(",") } : {})
        };
        const data = await addEventRequest<Record<string, unknown>>("/calendars", "GET", undefined, queryParams);
        // The AddEvent docs list the array key for this endpoint as "calendar"
        // (singular), inconsistent with "events"/"rsvps" elsewhere -- check both.
        const calendars = extractArray<AddEventCalendar>(data, "calendars", "calendar");

        if (!calendars.length) {
          return { content: [{ type: "text" as const, text: `No calendars found matching the given filters (page ${params.page}).` }] };
        }

        const output = { calendars, count: calendars.length, page: params.page, page_size: params.page_size };
        const lines = [`Found ${calendars.length} calendar(s) on page ${params.page}:`, ""];
        for (const cal of calendars) {
          lines.push(`- ${cal.title} (calendar_id: ${cal.calendar_id})`);
        }
        lines.push("", formatJson(output, CHARACTER_LIMIT));

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
          structuredContent: output as unknown as Record<string, unknown>
        };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    }
  );

  server.registerTool(
    "addevent_get_calendar",
    {
      title: "Retrieve AddEvent Calendar",
      description: `Retrieves a single calendar by its calendar_id.

Args:
  - calendar_id (string, required): The calendar to retrieve.

Returns: The full calendar object as JSON.

Error Handling:
  - Returns "Error: Not found..." (404) if the calendar_id doesn't exist.`,
      inputSchema: GetCalendarInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetCalendarInput) => {
      try {
        const calendar = await addEventRequest<AddEventCalendar>(`/calendars/${encodeURIComponent(params.calendar_id)}`, "GET");
        return {
          content: [{ type: "text" as const, text: formatJson(calendar, CHARACTER_LIMIT) }],
          structuredContent: calendar as unknown as Record<string, unknown>
        };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    }
  );

  server.registerTool(
    "addevent_update_calendar",
    {
      title: "Update AddEvent Calendar",
      description: `Updates an existing calendar. Only the fields you provide are changed; everything else is left as-is.

Args:
  - calendar_id (string, required): The calendar to update.
  - Any other field from addevent_create_calendar is optional here — include only what's changing.

Returns: The updated calendar object as JSON.

Error Handling:
  - Returns "Error: Not found..." (404) if calendar_id doesn't exist.`,
      inputSchema: UpdateCalendarInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: UpdateCalendarInput) => {
      try {
        const { calendar_id, ...body } = params;
        const calendar = await addEventRequest<AddEventCalendar>(`/calendars/${encodeURIComponent(calendar_id)}`, "PATCH", body);
        return {
          content: [{ type: "text" as const, text: `Updated calendar ${calendar_id}.\n\n${formatJson(calendar, CHARACTER_LIMIT)}` }],
          structuredContent: calendar as unknown as Record<string, unknown>
        };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    }
  );

  server.registerTool(
    "addevent_delete_calendar",
    {
      title: "Delete AddEvent Calendar",
      description: `Permanently deletes a calendar. This cannot be undone, and affects any events still on it.

Args:
  - calendar_id (string, required): The calendar to delete.

Returns: A confirmation message.

Examples:
  - Before deleting, consider calling addevent_search_events with this calendar_id to check what's still on it.

Error Handling:
  - Returns "Error: Not found..." (404) if the calendar_id doesn't exist.`,
      inputSchema: DeleteCalendarInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: DeleteCalendarInput) => {
      try {
        await addEventRequest<void>(`/calendars/${encodeURIComponent(params.calendar_id)}`, "DELETE");
        return { content: [{ type: "text" as const, text: `Deleted calendar ${params.calendar_id}.` }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    }
  );
}
