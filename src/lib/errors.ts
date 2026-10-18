/**
 * Supabase errors (PostgrestError, AuthError…) are plain objects, not Error
 * instances, so `cause instanceof Error` misses them and the UI ends up
 * showing a generic fallback. This extracts a readable message from whatever
 * was thrown, appending the Postgrest error code when present.
 */
export function errorMessage(cause: unknown, fallback = 'Something went wrong'): string {
  if (cause instanceof Error && cause.message) return cause.message;

  if (typeof cause === 'string' && cause.length > 0) return cause;

  if (cause && typeof cause === 'object') {
    const record = cause as Record<string, unknown>;
    const message = typeof record.message === 'string' ? record.message : '';
    if (message) {
      const code = typeof record.code === 'string' && record.code ? ` (${record.code})` : '';
      const details =
        typeof record.details === 'string' && record.details ? ` — ${record.details}` : '';
      return `${message}${code}${details}`;
    }
  }

  return fallback;
}
