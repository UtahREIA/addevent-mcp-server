/**
 * Type definitions for AddEvent Calendar & Events API v2 objects.
 *
 * These mirror the fields documented at https://docs.addevent.com/reference,
 * plus an index signature since AddEvent may return additional fields not
 * captured in the written docs (e.g. computed fields like landing_page_url).
 */

export type FreeBusy = "free" | "busy" | "default";
export type WeekdayBegin = "sunday" | "monday";
export type AttendingStatus = "going" | "maybe" | "not-going";

export interface AddEventEvent {
  id: string;
  calendar_id: string;
  title: string;
  datetime_start: string;
  datetime_end?: string;
  all_day_event?: boolean;
  timezone?: string;
  recurring_rule?: string;
  description?: string;
  internal_name?: string;
  location?: string;
  location_id?: number;
  organizer_name?: string;
  organizer_email?: string;
  reminder?: number;
  color?: number;
  free_busy?: FreeBusy;
  landing_page_template_id?: string;
  rsvp_enabled?: boolean;
  rsvp_form_id?: string;
  custom_data?: Record<string, unknown>;
  landing_page_url?: string;
  created?: string;
  [key: string]: unknown;
}

export interface AddEventCalendar {
  id: string;
  title: string;
  timezone?: string;
  weekday_begin?: WeekdayBegin;
  description?: string;
  internal_name?: string;
  calendar_color?: number;
  landing_page_template_id?: string;
  embeddable_calendar_template_id?: string;
  custom_data?: Record<string, unknown>;
  landing_page_url?: string;
  created?: string;
  [key: string]: unknown;
}

export interface AddEventRsvp {
  id: string;
  event_id: string;
  email: string;
  attending: AttendingStatus;
  rsvp_form_data?: Record<string, unknown>;
  created?: string;
  [key: string]: unknown;
}

export interface AddEventTimezone {
  timezone: string;
  utc_offset?: string;
  [key: string]: unknown;
}

// AddEvent's search endpoints wrap results in a resource-named array
// property. Confirmed live: "events", "calendars", and "rsvps" are all
// plural, matching the other two endpoints -- the AddEvent docs' mention
// of a singular "calendar" key was simply wrong. src/format.ts's
// extractArray() still checks both defensively, which is harmless now
// that this is confirmed, so it's left as-is.
export interface SearchMeta {
  page?: number;
  page_size?: number;
  total?: number;
  [key: string]: unknown;
}