// Central API, Endpoint Base URL, and Canonical Origin configuration
import { getOrCreateSessionId } from './session';

const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

// Remove trailing slash if present
export const API_BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

export const CANONICAL_FALLBACK_ORIGIN = 'https://hiccups.kumarharsh.in';

/**
 * Returns the target base origin for chaos endpoint URLs.
 * If VITE_API_BASE_URL is set (e.g. for Vercel frontend + external backend), uses that backend URL.
 * Otherwise uses the browser window origin, or falls back to the canonical Hiccups production URL.
 * Under no circumstance does this use hiccup.dev.
 */
export function getEndpointOrigin(): string {
  if (API_BASE_URL) {
    return API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return CANONICAL_FALLBACK_ORIGIN;
}

/**
 * Returns full API URL for control-plane endpoints (e.g., /api/v1/endpoints).
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Returns common request headers including anonymous owner session identity.
 */
export function getDefaultApiHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'Accept': 'application/json',
    'X-Hiccup-Session-Id': getOrCreateSessionId(),
    ...(extra || {})
  };
}
