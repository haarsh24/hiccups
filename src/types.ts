export type BehaviorType = 
  | 'latency'
  | 'error'
  | 'drop'
  | 'hang'
  | 'rate_limit'
  | 'drip'
  | 'malformed'
  | 'redirect_loop';

export interface LatencyParams {
  minMs: number;
  maxMs: number;
  jitter: boolean;
}

export interface ErrorParams {
  statusCode: number;
  customBody?: string;
  customHeaderKey?: string;
  customHeaderValue?: string;
}

export interface DropParams {
  mode: 'abrupt' | 'partial';
  bytesBeforeDrop?: number;
}

export interface HangParams {
  durationSeconds: number; // safety cap 120s
}

export interface RateLimitParams {
  maxRequestsPerMin: number;
  burstAllowance: number;
  retryAfterSeconds: number;
}

export interface DripParams {
  chunkSizeBytes: number;
  delayMsPerChunk: number;
  totalBytes: number;
}

export interface RedirectParams {
  maxRedirects: number;
}

export interface ChaosRule {
  id: string;
  type: BehaviorType;
  enabled: boolean;
  probability: number; // 0.0 to 1.0
  params: {
    latency?: LatencyParams;
    error?: ErrorParams;
    drop?: DropParams;
    hang?: HangParams;
    rateLimit?: RateLimitParams;
    drip?: DripParams;
    redirect?: RedirectParams;
  };
}

export interface ChaosEndpoint {
  id: string;
  slug: string;
  name: string;
  isAnonymous: boolean;
  createdAt: string;
  expiresAt?: string | null; // ISO date string or null
  managementToken?: string; // unique token for custom endpoints
  flakyPercentage: number; // 0-100 master probability %
  defaultResponseStatus: number; // default 200
  defaultResponseBody: string; // JSON string
  rules: ChaosRule[];
}

export interface RequestLog {
  id: string;
  endpointId: string;
  slug: string;
  timestamp: string;
  method: string;
  path: string;
  clientIp: string;
  userAgent?: string;
  behaviorApplied: BehaviorType | 'none_clean';
  httpStatusReturned: number;
  durationMs: number;
  errorMessage?: string;
  details?: Record<string, unknown>;
}

export interface EndpointStats {
  totalRequests: number;
  successRequests: number;
  faultRequests: number;
  p50Latency: number;
  p90Latency: number;
  p95Latency: number;
  behaviorBreakdown: Record<BehaviorType | 'none_clean', number>;
}

export interface PresetProfile {
  id: string;
  name: string;
  tagline: string;
  iconName: string;
  description: string;
  flakyPercentage: number;
  rules: ChaosRule[];
}

export interface TestExecutionResult {
  status: number | string; // e.g. 503 or "ECONNRESET"
  ok: boolean;
  durationMs: number;
  headers: Record<string, string>;
  body: string;
  error?: string;
  behaviorDetected?: string;
}
