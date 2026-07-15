/** Parse a value that may be a JSON string or already-parsed object. */
export function parseJsonb<T>(value: T | string | null): T | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; }
    catch { return null; }
  }
  return value;
}
