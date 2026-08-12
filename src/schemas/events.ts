import { z } from "zod";
import { AddEventDatetimeSchema, PageSchema, PageSizeSchema, SortOrderSchema } from "./common.js";

export const FreeBusySchema = z.enum(["free", "busy", "default"]);
export const SortEventsBySchema = z.enum(["created", "title", "calendar_id", "datetime_start"]);

export const CreateEventInputSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .describe("The event's title. Must be a non-empty, single-line string."),
  calendar_id: z.string()
    .optional()
    .describe("The calendar this event belongs to. Defaults to the account's default calendar if omitted. Use addevent_search_calendars to find calendar IDs."),
  datetime_start: AddEventDatetimeSchema
    .describe("Start date/time, e.g. '2026-09-15 18:00' or '2026-09-15' for a date-only event."),
  datetime_end: AddEventDatetimeSchema
    .optional()
    .describe("End date/time, same format as datetime_start. Defaults to datetime_start + 1 hour if omitted."),
  all_day_event: z.boolean()
    .optional()
    .describe("If true, start/end times are ignored and only the date is used. Default false."),
  timezone: z.string()
    .optional()
    .describe("IANA-style timezone (e.g. 'America/Denver') or 'floating' for a time that stays the same on every viewer's local clock. Defaults to the calendar's timezone. Use addevent_list_timezones for supported values."),
  recurring_rule: z.string()
    .optional()
    .describe("iCalendar RRULE string for a repeating event (e.g. 'FREQ=MONTHLY;BYDAY=3TU' for the third Tuesday of every month). Leave empty for a one-time event. datetime_start must align with the rule for strict clients like Outlook desktop and Apple Calendar. Not supported by Yahoo Calendar."),
  description: z.string()
    .optional()
    .describe("Plain text or simplified HTML description. Keep to roughly 500 characters or fewer for cross-browser compatibility."),
  internal_name: z.string()
    .optional()
    .describe("Internal-only label, never shown publicly. Useful for a human-readable label or an external ID linking back to another system."),
  location: z.string()
    .optional()
    .describe("Address or URL (e.g. a Zoom link). Mutually exclusive with location_id."),
  location_id: z.number()
    .int()
    .min(0)
    .optional()
    .describe("ID of a saved location. Mutually exclusive with location."),
  organizer_name: z.string()
    .optional()
    .describe("Organizer's name. Must be paired with organizer_email."),
  organizer_email: z.string()
    .email()
    .optional()
    .describe("Organizer's email. Must be paired with organizer_name. Including an organizer makes calendar clients like Outlook desktop treat this as a meeting rather than an appointment."),
  reminder: z.number()
    .int()
    .min(0)
    .max(10800)
    .optional()
    .describe("Minutes before the event to send a reminder, 0 to 10800. Default 30. Only honored by Apple Calendar, Outlook desktop, and Office 365/Outlook.com."),
  color: z.number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("Event color, 1 to 20, matching the calendar's palette. Default 1."),
  free_busy: FreeBusySchema
    .optional()
    .describe("Whether the event blocks the attendee's calendar: 'free', 'busy', or 'default' (use their default setting)."),
  landing_page_template_id: z.string()
    .optional()
    .describe("Custom event landing page template ID, or 'default' for the standard AddEvent template."),
  rsvp_enabled: z.boolean()
    .optional()
    .describe("If true, attendees must RSVP before adding the event to their calendar. Default false."),
  rsvp_form_id: z.string()
    .optional()
    .describe("Custom RSVP form ID, or 'default' for the standard form."),
  custom_data: z.record(z.unknown())
    .optional()
    .describe("Arbitrary key-value metadata to attach to the event, e.g. an external ID linking back to GHL. Use snake_case keys.")
}).strict();

export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;

export const UpdateEventInputSchema = CreateEventInputSchema
  .partial()
  .extend({
    event_id: z.string().min(1).describe("The ID of the event to update.")
  })
  .strict();

export type UpdateEventInput = z.infer<typeof UpdateEventInputSchema>;

export const GetEventInputSchema = z.object({
  event_id: z.string().min(1).describe("The ID of the event to retrieve.")
}).strict();

export type GetEventInput = z.infer<typeof GetEventInputSchema>;

export const DeleteEventInputSchema = z.object({
  event_id: z.string().min(1).describe("The ID of the event to permanently delete. This cannot be undone.")
}).strict();

export type DeleteEventInput = z.infer<typeof DeleteEventInputSchema>;

export const SearchEventsInputSchema = z.object({
  calendar_ids: z.array(z.string())
    .optional()
    .describe("Limit results to these calendar IDs."),
  event_ids: z.array(z.string())
    .optional()
    .describe("Limit results to these specific event IDs."),
  datetime_min: z.string()
    .optional()
    .describe("Only events ending on/after this datetime (naive comparison, timezone not considered). Same formats as datetime_start."),
  datetime_max: z.string()
    .optional()
    .describe("Only events starting on/before this datetime (naive comparison, timezone not considered). Same formats as datetime_start."),
  search: z.string()
    .optional()
    .describe("Free-text search across title, internal_name, description, and location. Case-insensitive."),
  custom_data_key: z.string()
    .optional()
    .describe("Filter by a custom_data key. Must be paired with custom_data_value."),
  custom_data_value: z.string()
    .optional()
    .describe("Filter by a custom_data value. Must be paired with custom_data_key."),
  page: PageSchema,
  page_size: PageSizeSchema,
  sort_by: SortEventsBySchema
    .optional()
    .describe("Field to sort by. Defaults to 'created', or 'datetime_start' if datetime_min/datetime_max is set."),
  sort_order: SortOrderSchema
    .optional()
    .describe("Sort direction, 'asc' or 'desc'. Requires sort_by.")
}).strict();

export type SearchEventsInput = z.infer<typeof SearchEventsInputSchema>;
