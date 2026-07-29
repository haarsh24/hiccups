import { PresetProfile } from '../types';

export const PRESET_PROFILES: PresetProfile[] = [
  {
    id: 'flaky-payment-gateway',
    name: 'Flaky Payment Gateway',
    tagline: '30% random 503 & 429 errors with 800ms-2500ms jittered latency',
    iconName: 'CreditCard',
    description: 'Simulate an unreliable third-party payment provider like Stripe or PayPal during peak traffic spikes.',
    flakyPercentage: 40,
    rules: [
      {
        id: 'r-lat-1',
        type: 'latency',
        enabled: true,
        probability: 0.8,
        params: {
          latency: { minMs: 800, maxMs: 2500, jitter: true }
        }
      },
      {
        id: 'r-err-1',
        type: 'error',
        enabled: true,
        probability: 0.5,
        params: {
          error: {
            statusCode: 503,
            customBody: JSON.stringify({ error: "Service Unavailable", code: "PAYMENT_GATEWAY_TIMEOUT", retryable: true }, null, 2)
          }
        }
      }
    ]
  },
  {
    id: 'abrupt-socket-drop',
    name: 'Mid-Stream Connection Reset',
    tagline: 'Terminates TCP connection abruptly after sending partial bytes',
    iconName: 'Unplug',
    description: 'Tests if your client handles raw ECONNRESET or socket hanging without crashing background workers.',
    flakyPercentage: 75,
    rules: [
      {
        id: 'r-drop-1',
        type: 'drop',
        enabled: true,
        probability: 1.0,
        params: {
          drop: { mode: 'partial', bytesBeforeDrop: 64 }
        }
      }
    ]
  },
  {
    id: 'aggressive-rate-limiter',
    name: 'Aggressive Rate Limiter (429)',
    tagline: 'Enforces strict token bucket of 5 reqs/min with Retry-After header',
    iconName: 'ShieldAlert',
    description: 'Validates exponential backoff and compliance with HTTP 429 Retry-After response headers.',
    flakyPercentage: 100,
    rules: [
      {
        id: 'r-rl-1',
        type: 'rate_limit',
        enabled: true,
        probability: 1.0,
        params: {
          rateLimit: { maxRequestsPerMin: 5, burstAllowance: 2, retryAfterSeconds: 30 }
        }
      }
    ]
  },
  {
    id: 'drip-slow-streaming',
    name: 'Slow Drip Byte Streaming',
    tagline: 'Streams response 16 bytes every 250ms (slow read stream)',
    iconName: 'Gauge',
    description: 'Tests socket read timeout thresholds when a server connects quickly but transmits payload sluggishly.',
    flakyPercentage: 100,
    rules: [
      {
        id: 'r-drip-1',
        type: 'drip',
        enabled: true,
        probability: 1.0,
        params: {
          drip: { chunkSizeBytes: 16, delayMsPerChunk: 250, totalBytes: 256 }
        }
      }
    ]
  },
  {
    id: 'hang-timeout-ghost',
    name: '45-Second Connection Hang',
    tagline: 'Holds HTTP connection open silently to trigger HTTP client timeouts',
    iconName: 'Clock',
    description: 'Verifies whether client-side timeout settings (e.g. 5s or 10s) trigger properly before hanging threads.',
    flakyPercentage: 100,
    rules: [
      {
        id: 'r-hang-1',
        type: 'hang',
        enabled: true,
        probability: 1.0,
        params: {
          hang: { durationSeconds: 45 }
        }
      }
    ]
  },
  {
    id: 'malformed-json-payload',
    name: 'Malformed JSON Syntactic Error',
    tagline: 'Returns 200 OK with Content-Type: application/json but truncated JSON syntax',
    iconName: 'FileCode2',
    description: 'Tests if your JSON parser safely catches syntax errors instead of throwing unhandled uncaught exceptions.',
    flakyPercentage: 100,
    rules: [
      {
        id: 'r-mal-1',
        type: 'malformed',
        enabled: true,
        probability: 1.0,
        params: {}
      }
    ]
  },
  {
    id: 'infinite-redirect-loop',
    name: 'Infinite Redirect Loop (302)',
    tagline: 'Returns 302 redirects in an endless loop back to itself',
    iconName: 'RefreshCw',
    description: 'Verifies maximum redirect depth limits in curl, fetch, and HTTP clients.',
    flakyPercentage: 100,
    rules: [
      {
        id: 'r-red-1',
        type: 'redirect_loop',
        enabled: true,
        probability: 1.0,
        params: {
          redirect: { maxRedirects: 20 }
        }
      }
    ]
  }
];
