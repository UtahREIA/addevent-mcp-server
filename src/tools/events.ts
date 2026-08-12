import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { addEventRequest, handleApiError } from "../services/addevent-client.js";
import { formatJson, extractArray } from "../format.js";
import { CHARACTER_LIMIT } from "../constants.js";
import type { AddEventEvent } from "../types.js";
import {
  CreateEventInputSchema,
  UpdateEventInputSchema,
  GetEventInputSchema,
  DeleteEventInputSchema,
  SearchEventsInputSchema,
  type CreateEventInput,
  type UpdateEventInput,
  type GetEventInput,
  type DeleteEventInput,
  type SearchEventsInput
} from "../schemas/events.js";

export function registerEventTools(server: McpServer): void {
  server.registerTool(
    "addevent_create_event",
    {
      title: "Create AddEvent Event",
      description: `Creates a new event on an AddEvent calendar.

Args:
  - title (string, required): The event's title.
  - calendar_id (string, optional): Target calendar. Defaults to the account's default calendar. Use addevent_search_calendars to find IDs.
  - datetime_start (string, required): Start date/time, e.g. "2026-09-15 18:00" or "2026-09-15" for a date-only event.
  - datetime_end (string, optional): End date/time. Defaults to datetime_start + 1 hour.
  - all_day_event, timezone, recurring_rule, description, internal_name, location, location_id, organizer_name, organizer_email, reminder, color, free_busy, landing_page_template_id, rsvp_enabled, rsvp_form_id, custom_data: optional fields, see each field's description.

Returns: The created event object as JSON, including its event_id and public landing_page_url.

Examples:
  - "Create the Main Monthly meetup for Sept 15 at 6pm at [venue]" -> title, datetime_start, location set.
  - "Make it a recurring event, third Tuesday of every month" -> recurring_rule: "FREQ=MONTHLY;BYDAY=3TU".
  - Don't use when: the event already exists (use addevent_update_event instead).

Error Handling:
  - Returns a clear message if required fields are missing, the calendar_id doesn't exist, or the API rejects the request body (400).`,
      inputSchema: CreateEventInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params: CreateEventInput) => {
      try {
        const event = await addEventRequest<AddEventEvent>("/events", "POST", params);
        const summary = `Created event "${event.title}" (event_id: ${event.id})` +
          (event.landing_page_url ? `\n${event.landing_page_url}` : "");
        return {
          content: [{ type: "text" as const, text: `${summary}\n\n${formatJson(event, CHARACTER_LIMIT)}` }],
          structuredContent: event as unknown as Record<string, unknown>
        };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    }
  );

  server.registerTool(
    "addevent_search_events",
    {
      title: "Search AddEvent Events",
      description: `Searches events you've previously created. Does NOT create or modify events.

Args:
  - calendar_ids, event_ids (string[], optional): Narrow to specific calendars or events.
  - datetime_min, datetime_max (string, optional): Filter by date range. datetime_min matches events ending on/after that time; datetime_max matches events starting on/before it.
  - search (string, optional): Free-text match against title, internal_name, description, and location.
  - custom_data_key / custom_data_value (string, optional): Filter by a custom_data key-value pair. Both must be provided together.
  - page (number, default 1), page_size (number, 1-20, default 10): Pagination.
  - sort_by ('created' | 'title' | 'calendar_id' | 'datetime_start'), sort_order ('asc' | 'desc'): Sorting.

Returns:
  {
    "events": [ ...event objects... ],
    "count": number,   // events in this response
    "page": number,
    "page_size": number
  }
  An empty "events" array means no matches, not an error.

Examples:
  - "What events do we have next month?" -> datetime_min/datetime_max set to that month's range.
  - "Find the Main Monthly event" -> search: "Main Monthly".
  - Don't use when: you already have the event_id (use addevent_get_event, it's cheaper).

Error Handling:
  - Returns "Error: Invalid request..." if a filter combination is invalid (e.g. custom_data_key without custom_data_value).`,
      inputSchema: SearchEventsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: SearchEventsInput) => {
      try {
        const { calendar_ids, event_ids, ...rest } = params;
        const queryParams: Record<string, unknown> = {
          ...rest,
          ...(calendar_ids ? { calendar_ids: calendar_ids.join(",") } : {}),
          ...(event_ids ? { event_ids: event_ids.join(",") } : {})
        };
        const data = await addEventRequest<Record<string, unknown>>("/events", "GET", undefined, queryParams);
        const events = extractArray<AddEventEvent>(data, "events");

        if (!events.length) {
          return { content: [{ type: "text" as const, text: `No events found matching the given filters (page ${params.page}).` }] };
        }

        const output = { events, count: events.length, page: params.page, page_size: params.page_size };
        const lines = [`Found ${events.length} event(s) on page ${params.page}:`, ""];
        for (const ev of events) {
          lines.push(`- ${ev.title} (event_id: ${ev.id}) - starts ${ev.datetime_start}${ev.calendar_id ? `, calendar ${ev.calendar_id}` : ""}`);
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
    "addevent_get_event",
    {
      title: "Retrieve AddEvent Event",
      description: `Retrieves a single event by its event_id.

Args:
  - event_id (string, required): The event to retrieve.

Returns: The full event object as JSON.

Examples:
  - "Show me the details for event evt_abc123" -> event_id: "evt_abc123".
  - Don't use when: you don't have the event_id yet (use addevent_search_events first).

Error Handling:
  - Returns "Error: Not found..." (404) if the event_id doesn't exist.`,
      inputSchema: GetEventInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetEventInput) => {
      try {
        const event = await addEventRequest<AddEventEvent>(`/events/${encodeURIComponent(params.event_id)}`, "GET");
        return {
          content: [{ type: "text" as const, text: formatJson(event, CHARACTER_LIMIT) }],
          structuredContent: event as unknown as Record<string, unknown>
        };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    }
  );

  server.registerTool(
    "addevent_update_event",
    {
      title: "Update AddEvent Event",
      description: `Updates an existing event. Only the fields you provide are changed; everything else is left as-is.

Args:
  - event_id (string, required): The event to update.
  - Any other field from addevent_create_event (title, datetime_start, datetime_end, location, description, etc.) is optional here — include only what's changing.

Returns: The updated event object as JSON.

Examples:
  - "Move the Main Monthly meetup to 7pm" -> event_id set, datetime_start updated.
  - "Change the location to the new venue" -> event_id set, location updated.
  - Don't use when: the event doesn't exist yet (use addevent_create_event).

Error Handling:
  - Returns "Error: Not found..." (404) if event_id doesn't exist, or "Error: Invalid request..." (400) if a field value fails validation.`,
      inputSchema: UpdateEventInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: UpdateEventInput) => {
      try {
        const { event_id, ...body } = params;
        const event = await addEventRequest<AddEventEvent>(`/events/${encodeURIComponent(event_id)}`, "PATCH", body);
        return {
          content: [{ type: "text" as const, text: `Updated event ${event_id}.\n\n${formatJson(event, CHARACTER_LIMIT)}` }],
          structuredContent: event as unknown as Record<string, unknown>
        };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    }
  );

  server.registerTool(
    "addevent_delete_event",
    {
      title: "Delete AddEvent Event",
      description: `Permanently deletes an event. This cannot be undone.

Args:
  - event_id (string, required): The event to delete.

Returns: A confirmation message.

Examples:
  - "Delete the duplicate event we just created" -> event_id set.
  - Don't use when: you want to hide an event without losing it (there's no archive/unpublish option in this API; deletion is permanent).

Error Handling:
  - Returns "Error: Not found..." (404) if the event_id doesn't exist.`,
      inputSchema: DeleteEventInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: DeleteEventInput) => {
      try {
        await addEventRequest<void>(`/events/${encodeURIComponent(params.event_id)}`, "DELETE");
        return { content: [{ type: "text" as const, text: `Deleted event ${params.event_id}.` }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    }
  );
}