/**
 * Pretty-prints an object as JSON, truncating if it exceeds the character
 * limit so a single tool call can't overwhelm the model's context.
 */
export function formatJson(obj: unknown, limit: number): string {
  const text = JSON.stringify(obj, null, 2);
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit)}\n... [truncated, ${text.length} total characters. Narrow your search with filters or a smaller page_size.]`;
}

/**
 * AddEvent's search endpoints wrap results in a resource-named array
 * property (e.g. { "events": [...] }). This reads that array defensively
 * across a couple of plausible key names in case the exact key differs
 * from what's documented, rather than silently returning an empty list.
 */
export function extractArray<T>(data: Record<string, unknown>, ...keys: string[]): T[] {
  for (const key of keys) {
    const value = data[key];
    if (Array.isArray(value)) {
      return value as T[];
    }
  }
  return [];
}
