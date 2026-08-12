import { z } from "zod";

export const SortOrderSchema = z.enum(["asc", "desc"]);

export const PageSchema = z.number()
  .int()
  .min(1)
  .default(1)
  .describe("Page number of results, starting at 1.");

export const PageSizeSchema = z.number()
  .int()
  .min(1)
  .max(20)
  .default(10)
  .describe("Number of results per page, between 1 and 20.");

// Datetimes accepted by the AddEvent API: "YYYY-MM-DD HH:mm:ss",
// "YYYY-MM-DD HH:mm", or "YYYY-MM-DD".
export const AddEventDatetimeSchema = z.string()
  .regex(
    /^\d{4}-\d{2}-\d{2}(\s\d{2}:\d{2}(:\d{2})?)?$/,
    "Use 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm', or 'YYYY-MM-DD' (e.g. '2026-09-15 18:00')."
  );
