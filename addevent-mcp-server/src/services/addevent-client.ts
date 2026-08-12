import axios, { AxiosError } from "axios";
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "../constants.js";

interface AddEventErrorBody {
  error_id?: string;
  message?: string;
}

function getApiKey(): string {
  const apiKey = process.env.ADDEVENT_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ADDEVENT_API_KEY environment variable is required. Set it to the API token " +
      "from Settings > API in your AddEvent dashboard (dashboard.addevent.com)."
    );
  }
  return apiKey;
}

/**
 * Shared request function for every AddEvent tool. Centralizes base URL,
 * timeout, and Bearer auth so individual tools only pass an endpoint,
 * method, and payload.
 */
export async function addEventRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  data?: unknown,
  params?: Record<string, unknown>
): Promise<T> {
  const response = await axios({
    method,
    url: `${API_BASE_URL}${endpoint}`,
    data,
    params,
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${getApiKey()}`
    }
  });
  return response.data as T;
}

/**
 * Converts any error thrown by addEventRequest into a clear, actionable
 * message for the model to read and relay (or retry from).
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error && error.message.startsWith("ADDEVENT_API_KEY")) {
    return `Error: ${error.message}`;
  }

  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<AddEventErrorBody>;
    if (err.response) {
      const body = err.response.data;
      const detail = body?.message ? ` - ${body.message}` : "";
      const errorId = body?.error_id ? ` (error_id: ${body.error_id})` : "";
      switch (err.response.status) {
        case 400:
          return `Error: Invalid request${detail}${errorId}. Check the field values against the tool's schema.`;
        case 401:
          return "Error: Authentication failed. ADDEVENT_API_KEY is missing or invalid, check Settings > API in the AddEvent dashboard.";
        case 403:
          return "Error: Permission denied for this AddEvent resource.";
        case 404:
          return "Error: Not found. Double check the event_id, calendar_id, or attendee_id.";
        case 429:
          return "Error: AddEvent rate limit exceeded. Wait a moment before retrying.";
        default:
          return `Error: AddEvent API request failed with status ${err.response.status}${detail}${errorId}`;
      }
    } else if (err.code === "ECONNABORTED") {
      return "Error: Request to AddEvent timed out. Please try again.";
    }
  }

  return `Error: Unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`;
}
