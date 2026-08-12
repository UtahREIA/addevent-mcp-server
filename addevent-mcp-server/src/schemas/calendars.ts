import { z } from "zod";
import { PageSchema, PageSizeSchema, SortOrderSchema } from "./common.js";

export const WeekdayBeginSchema = z.enum(["sunday", "monday"]);
export const SortCalendarsBySchema = z.enum(["created", "title"]);

export const CreateCalendarInputSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .describe("The calendar's title. Must be a non-empty, single-line string."),
  timezone: z.string()
    .optional()
    .describe("Default timezone for events created on this calendar (e.g. 'America/Denver'). Defaults to 'America/Los_Angeles'. Use addevent_list_timezones for supported values."),
  weekday_begin: WeekdayBeginSchema
    .optional()
    .describe("First day of the week shown on the calendar. Default 'sunday'."),
  description: z.string()
    .optional()
    .describe("Shown on the calendar's landing page. Accepts plain text or simplified HTML."),
  internal_name: z.string()
    .optional()
    .describe("Internal-only label, never shown publicly."),
  calendar_color: z.number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("Calendar color, 1 to 20. Default 1."),
  landing_page_template_id: z.string()
    .optional()
    .describe("Custom calendar landing page template ID, or 'default'."),
  embeddable_calendar_template_id: z.string()
    .optional()
    .describe("Custom embeddable calendar template ID, or 'default'."),
  custom_data: z.record(z.unknown())
    .optional()
    .describe("Arbitrary key-value metadata to attach to the calendar. Use snake_case keys.")
}).strict();

export type CreateCalendarInput = z.infer<typeof CreateCalendarInputSchema>;

export const UpdateCalendarInputSchema = CreateCalendarInputSchema
  .partial()
  .extend({
    calendar_id: z.string().min(1).describe("The ID of the calendar to update.")
  })
  .strict();

export type UpdateCalendarInput = z.infer<typeof UpdateCalendarInputSchema>;

export const GetCalendarInputSchema = z.object({
  calendar_id: z.string().min(1).describe("The ID of the calendar to retrieve.")
}).strict();

export type GetCalendarInput = z.infer<typeof GetCalendarInputSchema>;

export const DeleteCalendarInputSchema = z.object({
  calendar_id: z.string().min(1).describe("The ID of the calendar to permanently delete. Check addevent_search_events first, since events on this calendar are affected too.")
}).strict();

export type DeleteCalendarInput = z.infer<typeof DeleteCalendarInputSchema>;

export const SearchCalendarsInputSchema = z.object({
  calendar_ids: z.array(z.string())
    .optional()
    .describe("Limit results to these specific calendar IDs."),
  page: PageSchema,
  page_size: PageSizeSchema,
  sort_by: SortCalendarsBySchema
    .optional()
    .describe("Field to sort by: 'created' or 'title'."),
  sort_order: SortOrderSchema
    .optional()
    .describe("Sort direction, 'asc' or 'desc'. Requires sort_by.")
}).strict();

export type SearchCalendarsInput = z.infer<typeof SearchCalendarsInputSchema>;
