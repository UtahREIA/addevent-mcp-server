import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { addEventRequest, handleApiError } from "../services/addevent-client.js";
import { formatJson, extractArray } from "../format.js";
import { CHARACTER_LIMIT } from "../constants.js";
import type { AddEventRsvp } from "../types.js";
import {
  CreateRsvpInputSchema,
  UpdateRsvpInputSchema,
  GetRsvpInputSchema,
  DeleteRsvpInputSchema,
  SearchRsvpsInputSchema,
  type CreateRsvpInput,
  type UpdateRsvpInput,
  type GetRsvpInput,
  type DeleteRsvpInput,
  type SearchRsvpsInput
} from "../schemas/rsvps.js";

export function registerRsvpTools(server: McpServer): void {
  server.registerTool(
    "addevent_create_rsvp",
    {
      title: "Create AddEvent RSVP Attendee",
      description: `Registers an RSVP attendee on an event. Only works on events created with rsvp_enabled: true.

Args:
  - event_id (string, required): The event to RSVP to.
  - email (string, required): Attendee's email. Must be unique per event.
  - attending ('going' | 'maybe' | 'not-going', optional): Default 'going'.
  - notify ('active', optional): Set to send confirmation/notification emails. Omitted by default (silent creation) — useful when backfilling attendees from another system.
  - rsvp_form_data (object, optional): Values for the event's RSVP form. The default form needs { "name": "..." }.

Returns: The created RSVP attendee object as JSON, including its attendee_id.

Examples:
  - "Add jane@example.com as attending the Main Monthly meetup" -> event_id, email set.
  - "Import these 20 signups from our spreadsheet without emailing them" -> omit notify.
  - Don't use when: the event doesn't have RSVP enabled (check with addevent_get_event first).

Error Handling:
  - Returns "Error: Invalid request..." (400) if the email is already registered for this event, or rsvp_form_data is missing a required field.`,
      inputSchema: CreateRsvpInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params: CreateRsvpInput) => {
      try {
        const { event_id, ...body } = params;
        const rsvp = await addEventRequest<AddEventRsvp>(`/events/${encodeURIComponent(event_id)}/rsvps`, "POST", body);
        const summary = `RSVP created for ${rsvp.email} on event ${event_id} (attendee_id: ${rsvp.id}, attending: ${rsvp.attending})`;
        return {
          content: [{ type: "text" as const, text: `${summary}\n\n${formatJson(rsvp, CHARACTER_LIMIT)}` }],
          structuredContent: rsvp as unknown as Record<string, unknown>
        };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    }
  );

  server.registerTool(
    "addevent_search_rsvps",
    {
      title: "Search AddEvent RSVP Attendees",
      description: `Searches RSVP attendees you've previously created. Does NOT create or modify RSVPs.

Args:
  - calendar_ids, event_ids (string[], optional): Narrow to attendees of these calendars or events.
  - attending (array of 'going' | 'maybe' | 'not-going', optional): Filter by response.
  - page (number, default 1), page_size (number, 1-20, default 10): Pagination.
  - sort_by ('created' | 'event_id' | 'attending' | 'email'), sort_order ('asc' | 'desc'): Sorting.

Returns:
  {
    "rsvps": [ ...attendee objects... ],
    "count": number,
    "page": number,
    "page_size": number
  }
  An empty "rsvps" array means no matches, not an error.

Examples:
  - "Who's RSVP'd yes to the Main Monthly meetup?" -> event_ids: [that event's ID], attending: ["going"].
  - "How many people said maybe across all our events this month?" -> attending: ["maybe"], combined with an event_ids or calendar_ids filter.
  - Don't use when: you already have the attendee_id (use addevent_get_rsvp, it's cheaper).`,
      inputSchema: SearchRsvpsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: SearchRsvpsInput) => {
      try {
        const { calendar_ids, event_ids, attending, ...rest } = params;
        const queryParams: Record<string, unknown> = {
          ...rest,
          ...(calendar_ids ? { calendar_ids: calendar_ids.join(",") } : {}),
          ...(event_ids ? { event_ids: event_ids.join(",") } : {}),
          ...(attending ? { attending: attending.join(",") } : {})
        };
        const data = await addEventRequest<Record<string, unknown>>("/rsvps", "GET", undefined, queryParams);
        const rsvps = extractArray<AddEventRsvp>(data, "rsvps");

        if (!rsvps.length) {
          return { content: [{ type: "text" as const, text: `No RSVP attendees found matching the given filters (page ${params.page}).` }] };
        }

        const output = { rsvps, count: rsvps.length, page: params.page, page_size: params.page_size };
        const lines = [`Found ${rsvps.length} RSVP attendee(s) on page ${params.page}:`, ""];
        for (const rsvp of rsvps) {
          lines.push(`- ${rsvp.email} - ${rsvp.attending} (attendee_id: ${rsvp.id}, event ${rsvp.event_id})`);
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
    "addevent_get_rsvp",
    {
      title: "Retrieve AddEvent RSVP Attendee",
      description: `Retrieves a single RSVP attendee by attendee_id.

Args:
  - attendee_id (string, required): The RSVP attendee to retrieve.

Returns: The full RSVP attendee object as JSON.

Error Handling:
  - Returns "Error: Not found..." (404) if the attendee_id doesn't exist.`,
      inputSchema: GetRsvpInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetRsvpInput) => {
      try {
        const rsvp = await addEventRequest<AddEventRsvp>(`/rsvps/${encodeURIComponent(params.attendee_id)}`, "GET");
        return {
          content: [{ type: "text" as const, text: formatJson(rsvp, CHARACTER_LIMIT) }],
          structuredContent: rsvp as unknown as Record<string, unknown>
        };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    }
  );

  server.registerTool(
    "addevent_update_rsvp",
    {
      title: "Update AddEvent RSVP Attendee",
      description: `Updates an existing RSVP attendee. Only the fields you provide are changed; everything else is left as-is.

Args:
  - attendee_id (string, required): The RSVP attendee to update.
  - email, attending, rsvp_form_data: optional — include only what's changing.

Returns: The updated RSVP attendee object as JSON.

Examples:
  - "Mark jane@example.com as not going anymore" -> attendee_id set, attending: "not-going".

Error Handling:
  - Returns "Error: Not found..." (404) if attendee_id doesn't exist.`,
      inputSchema: UpdateRsvpInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: UpdateRsvpInput) => {
      try {
        const { attendee_id, ...body } = params;
        const rsvp = await addEventRequest<AddEventRsvp>(`/rsvps/${encodeURIComponent(attendee_id)}`, "PATCH", body);
        return {
          content: [{ type: "text" as const, text: `Updated RSVP attendee ${attendee_id}.\n\n${formatJson(rsvp, CHARACTER_LIMIT)}` }],
          structuredContent: rsvp as unknown as Record<string, unknown>
        };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    }
  );

  server.registerTool(
    "addevent_delete_rsvp",
    {
      title: "Delete AddEvent RSVP Attendee",
      description: `Permanently deletes an RSVP attendee. This cannot be undone.

Args:
  - attendee_id (string, required): The RSVP attendee to delete.

Returns: A confirmation message.

Error Handling:
  - Returns "Error: Not found..." (404) if the attendee_id doesn't exist.`,
      inputSchema: DeleteRsvpInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: DeleteRsvpInput) => {
      try {
        await addEventRequest<void>(`/rsvps/${encodeURIComponent(params.attendee_id)}`, "DELETE");
        return { content: [{ type: "text" as const, text: `Deleted RSVP attendee ${params.attendee_id}.` }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    }
  );
}