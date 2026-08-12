import { z } from "zod";
import { PageSchema, PageSizeSchema, SortOrderSchema } from "./common.js";

export const AttendingSchema = z.enum(["going", "maybe", "not-going"]);
export const SortRsvpsBySchema = z.enum(["created", "event_id", "attending", "email"]);

export const CreateRsvpInputSchema = z.object({
  event_id: z.string()
    .min(1)
    .describe("The event to RSVP to."),
  email: z.string()
    .email()
    .describe("Attendee's email address. Must be unique per event; update and reminder emails are sent here."),
  attending: AttendingSchema
    .optional()
    .describe("Attendee's response. Default 'going'."),
  notify: z.literal("active")
    .optional()
    .describe("Set to 'active' to send the attendee a confirmation email and, if the event's RSVP settings call for it, notify the organizer. Omit to create the RSVP silently (no emails sent)."),
  rsvp_form_data: z.record(z.unknown())
    .optional()
    .describe("Values for the event's RSVP form fields. The default form requires a 'name' field, e.g. { \"name\": \"Jane Doe\" }.")
}).strict();

export type CreateRsvpInput = z.infer<typeof CreateRsvpInputSchema>;

export const UpdateRsvpInputSchema = z.object({
  attendee_id: z.string()
    .min(1)
    .describe("The ID of the RSVP attendee to update."),
  email: z.string()
    .email()
    .optional()
    .describe("New email address, if changing it."),
  attending: AttendingSchema
    .optional()
    .describe("New response: 'going', 'maybe', or 'not-going'."),
  rsvp_form_data: z.record(z.unknown())
    .optional()
    .describe("Updated values for the event's RSVP form fields.")
}).strict();

export type UpdateRsvpInput = z.infer<typeof UpdateRsvpInputSchema>;

export const GetRsvpInputSchema = z.object({
  attendee_id: z.string().min(1).describe("The ID of the RSVP attendee to retrieve.")
}).strict();

export type GetRsvpInput = z.infer<typeof GetRsvpInputSchema>;

export const DeleteRsvpInputSchema = z.object({
  attendee_id: z.string().min(1).describe("The ID of the RSVP attendee to permanently delete. This cannot be undone.")
}).strict();

export type DeleteRsvpInput = z.infer<typeof DeleteRsvpInputSchema>;

export const SearchRsvpsInputSchema = z.object({
  calendar_ids: z.array(z.string())
    .optional()
    .describe("Limit to attendees of events on these calendars."),
  event_ids: z.array(z.string())
    .optional()
    .describe("Limit to attendees of these specific events."),
  attending: z.array(AttendingSchema)
    .optional()
    .describe("Limit to attendees with these responses."),
  page: PageSchema,
  page_size: PageSizeSchema,
  sort_by: SortRsvpsBySchema
    .optional()
    .describe("Field to sort by: 'created', 'event_id', 'attending', or 'email'."),
  sort_order: SortOrderSchema
    .optional()
    .describe("Sort direction, 'asc' or 'desc'. Requires sort_by.")
}).strict();

export type SearchRsvpsInput = z.infer<typeof SearchRsvpsInputSchema>;
