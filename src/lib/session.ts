// Anonymous session tracking for Hiccups
const SESSION_STORAGE_KEY = 'hiccups_anon_session_token';

/**
 * Returns or generates a persistent anonymous session ID.
 * This guarantees privacy and prevents cross-session pollution or enumeration
 * without forcing developers to go through a login wall.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    return 'hiccups_anon_server_session';
  }

  try {
    let id = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) {
      id = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
      localStorage.setItem(SESSION_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return 'sess_fallback_ephemeral';
  }
}
