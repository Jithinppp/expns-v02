/** Turns raw Supabase auth errors into copy a human can act on. */
export function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return 'Wrong email or password.';
  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email first — check your inbox.';
  }
  if (normalized.includes('user already registered')) {
    return 'An account with this email already exists. Log in instead.';
  }
  if (normalized.includes('password should be at least')) {
    return 'Password must be at least 6 characters.';
  }
  if (normalized.includes('rate limit')) {
    return 'Too many attempts — wait a moment and try again.';
  }
  if (normalized.includes('is invalid')) return 'That email address looks invalid.';
  return message;
}
