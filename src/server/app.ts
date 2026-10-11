import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { ChaosEndpoint, RequestLog, EndpointStats, ChaosRule, BehaviorType } from '../types';
import { PRESET_PROFILES } from '../data/presets';

export const app = express();

// Security and body limits: bound JSON and urlencoded to 64KB to prevent memory exhaustion
app.use(express.json({ limit: '64kb' }));
app.use(express.text({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

// Vercel Serverless Gateway URL Normalization Middleware
// When Vercel rewrites routes, it may pass __v_path or x-matched-path. We normalize req.url so Express routes match seamlessly.
app.use((req: Request, res: Response, next: NextFunction) => {
  try {
    const urlObj = new URL(req.url, 'http://localhost');
    const vPath = urlObj.searchParams.get('__v_path');
    const matchedPath = (req.headers['x-matched-path'] || req.headers['x-vercel-matched-path']) as string | undefined;
    const originalUrl = (req.headers['x-vercel-original-url']) as string | undefined;

    if (vPath) {
      urlObj.searchParams.delete('__v_path');
      const search = urlObj.search ? urlObj.search : '';
      req.url = vPath + search;
    } else if (matchedPath && (req.url === '/api' || req.url === '/api/' || req.url.startsWith('/api?'))) {
      const search = urlObj.search ? urlObj.search : '';
      req.url = matchedPath + search;
    } else if (originalUrl && (req.url === '/api' || req.url === '/api/' || req.url.startsWith('/api?'))) {
      req.url = originalUrl;
    }
  } catch {
    // Preserve req.url as is if URL parsing encounters unexpected formatting
  }
  next();
});

// Global CORS Middleware for both Chaos endpoints (/e/*) and Control Plane (/api/v1/*)
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Vary', 'Origin');
  } else {
    res.header('Access-Control-Allow-Origin', '*');
    // Notice: Do NOT set Access-Control-Allow-Credentials when Access-Control-Allow-Origin is '*'
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Hiccup-Test-Client, X-Hiccup-Session-Id, X-Management-Token, X-Hiccup-Management-Token, x-hiccup-behavior, x-faultline-behavior'
  );
  res.header(
    'Access-Control-Expose-Headers',
    'x-hiccup-behavior, x-hiccup-request-id, x-faultline-behavior, retry-after, content-length, content-type, x-management-token, x-hiccup-management-token'
  );

  // Fast preflight response for OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Storage Engine
const endpointsMap = new Map<string, ChaosEndpoint>(); // endpoint id -> ChaosEndpoint
const slugToIdMap = new Map<string, string>(); // slug -> endpoint id
const logsMap = new Map<string, RequestLog[]>(); // endpoint id -> array of logs
const rateLimitMap = new Map<string, { tokens: number; lastRefill: number }>(); // key: endpointId:clientIp
const creationRateLimitMap = new Map<string, { count: number; resetAt: number }>(); // key: clientIp
const deletedEndpointIds = new Set<string>(); // prevent resurrecting deleted endpoints on merge

// Multi-location storage engine: handles multi-process, Docker/VPS, and serverless environments
const DATA_FILE = path.join(process.env.DATA_DIR || os.tmpdir(), 'hiccups_state_store.json');
const LOCAL_DATA_FILE = path.join(process.cwd(), '.data', 'hiccups_state_store.json');

function getStorePaths(): string[] {
  const list: string[] = [DATA_FILE];
  if (!list.includes(LOCAL_DATA_FILE)) {
    list.push(LOCAL_DATA_FILE);
  }
  const tmpFallback = path.join(os.tmpdir(), 'hiccups_state_store.json');
  if (!list.includes(tmpFallback)) {
    list.push(tmpFallback);
  }
  return list;
}

function restoreState() {
  const candidatePaths = getStorePaths();
  for (const filePath of candidatePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.endpoints)) {
          for (const ep of parsed.endpoints) {
            if (ep && ep.id && !deletedEndpointIds.has(ep.id)) {
              if (!endpointsMap.has(ep.id)) {
                endpointsMap.set(ep.id, ep);
              }
              if (ep.slug) {
                slugToIdMap.set(ep.slug.toLowerCase().trim(), ep.id);
              }
            }
          }
        }
        if (Array.isArray(parsed.slugs)) {
          for (const [slug, id] of parsed.slugs) {
            if (slug && id && !deletedEndpointIds.has(id)) {
              slugToIdMap.set(slug.toLowerCase().trim(), id);
            }
          }
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // Ensure demo endpoint is permanently seeded
  endpointsMap.set(demoEndpoint.id, demoEndpoint);
  slugToIdMap.set(demoSlug, demoEndpoint.id);
  slugToIdMap.set('demo-flaky-api', demoEndpoint.id);
}

function persistState() {
  try {
    // 1. Read existing from all store files first and merge into memory before writing
    // This prevents one process or serverless request from wiping endpoints saved by another!
    const candidatePaths = getStorePaths();
    for (const filePath of candidatePaths) {
      try {
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.endpoints)) {
            for (const ep of parsed.endpoints) {
              if (ep && ep.id && !deletedEndpointIds.has(ep.id)) {
                if (!endpointsMap.has(ep.id)) {
                  endpointsMap.set(ep.id, ep);
                }
                if (ep.slug) {
                  slugToIdMap.set(ep.slug.toLowerCase().trim(), ep.id);
                }
              }
            }
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    // 2. Index all active non-deleted endpoints in slugToIdMap
    for (const ep of endpointsMap.values()) {
      if (ep.slug && !deletedEndpointIds.has(ep.id)) {
        slugToIdMap.set(ep.slug.toLowerCase().trim(), ep.id);
      }
    }

    // 3. Serialize merged snapshot (excluding deleted endpoints)
    const validEndpoints = Array.from(endpointsMap.values()).filter(ep => !deletedEndpointIds.has(ep.id));
    const validSlugs = Array.from(slugToIdMap.entries()).filter(([_, id]) => !deletedEndpointIds.has(id));
    const data = {
      endpoints: validEndpoints,
      slugs: validSlugs
    };
    const serialized = JSON.stringify(data, null, 2);

    // 4. Write to all candidate writable paths
    for (const filePath of candidatePaths) {
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, serialized, 'utf-8');
      } catch {
        // Ignore write error on read-only directories
      }
    }
  } catch (err) {
    console.error('Failed to persist state:', err);
  }
}

// Reserved slugs list
const RESERVED_SLUGS = new Set([
  'api',
  'e',
  'health',
  'robots.txt',
  'manus-routes.json',
  'assets',
  'static',
  'favicon.ico',
  'admin',
  'dashboard',
  'status',
  'index.html'
]);

// Helper generator for random slug
function generateSlug(): string {
  const adjectives = ['flaky', 'choppy', 'jittery', 'rocky', 'faulty', 'turbulent', 'unstable', 'broken', 'sluggish', 'ghostly'];
  const nouns = ['fox', 'port', 'node', 'wave', 'stream', 'socket', 'gate', 'bridge', 'pulse', 'channel'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}-${noun}-${num}`;
}

// Default initial rules for new endpoints
export function createDefaultRules(): ChaosRule[] {
  return [
    {
      id: `r-lat-${Date.now()}`,
      type: 'latency',
      enabled: true,
      probability: 0.7,
      params: {
        latency: { minMs: 500, maxMs: 2000, jitter: true }
      }
    },
    {
      id: `r-err-${Date.now()}`,
      type: 'error',
      enabled: true,
      probability: 0.4,
      params: {
        error: {
          statusCode: 503,
          customBody: JSON.stringify(
            { error: "Service Unavailable", code: "HICCUP_INJECTED_503", message: "Chaos rule triggered" },
            null,
            2
          )
        }
      }
    },
    {
      id: `r-drop-${Date.now()}`,
      type: 'drop',
      enabled: false,
      probability: 0.2,
      params: {
        drop: { mode: 'partial', bytesBeforeDrop: 64 }
      }
    },
    {
      id: `r-hang-${Date.now()}`,
      type: 'hang',
      enabled: false,
      probability: 0.1,
      params: {
        hang: { durationSeconds: 15 } // bounded cap 15s
      }
    },
    {
      id: `r-rl-${Date.now()}`,
      type: 'rate_limit',
      enabled: false,
      probability: 1.0,
      params: {
        rateLimit: { maxRequestsPerMin: 10, burstAllowance: 2, retryAfterSeconds: 15 }
      }
    },
    {
      id: `r-drip-${Date.now()}`,
      type: 'drip',
      enabled: false,
      probability: 0.5,
      params: {
        drip: { chunkSizeBytes: 16, delayMsPerChunk: 150, totalBytes: 256 }
      }
    }
  ];
}

// Seed the permanent Demo Chaos Endpoint required by public contract & preview (/e/demo-chaos)
const demoSlug = 'demo-chaos';
const demoEndpoint: ChaosEndpoint = {
  id: 'ep-demo-chaos',
  slug: demoSlug,
  name: 'Demo Chaos Endpoint',
  isAnonymous: false,
  isDemo: true,
  createdAt: new Date().toISOString(),
  expiresAt: null, // permanent
  flakyPercentage: 50,
  defaultResponseStatus: 200,
  defaultResponseBody: JSON.stringify(
    { status: "ok", message: "Hello from Hiccups! This endpoint was reached successfully without chaos." },
    null,
    2
  ),
  rules: createDefaultRules()
};

endpointsMap.set(demoEndpoint.id, demoEndpoint);
slugToIdMap.set(demoSlug, demoEndpoint.id);
// Also alias legacy slug demo-flaky-api to same demo endpoint
slugToIdMap.set('demo-flaky-api', demoEndpoint.id);
logsMap.set(demoEndpoint.id, []);

// Restore any prior endpoints from storage
restoreState();

// Utility to append redacted log
function addLog(endpointId: string, log: Omit<RequestLog, 'id' | 'endpointId'>) {
  const logs = logsMap.get(endpointId) || [];
  const newLog: RequestLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    endpointId,
    ...log
  };
  logs.unshift(newLog);
  // Keep max 150 logs in memory
  if (logs.length > 150) {
    logs.pop();
  }
  logsMap.set(endpointId, logs);
}

// Extract client IP safely
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// Extract and sanitize owner session ID from client header
function getSessionId(req: Request): string {
  const header = (req.headers['x-hiccup-session-id'] as string) || '';
  if (header && typeof header === 'string' && header.trim().length > 0) {
    return header.trim().slice(0, 64);
  }
  const auth = (req.headers['authorization'] as string) || '';
  if (auth.startsWith('Bearer ')) {
    return auth.replace('Bearer ', '').trim().slice(0, 64);
  }
  return '';
}

// ==========================================
// 1. HEALTH, ROBOTS, & ROUTE MANIFESTS
// ==========================================

// Service Health check
app.get(['/health', '/api/v1/health'], (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    status: 'ok',
    service: 'Hiccups Chaos Engine',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Crawling policy: allow home, disallow chaos endpoints and API routes
app.get('/robots.txt', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send('User-agent: *\nAllow: /\nDisallow: /e/\nDisallow: /api/\n');
});

// manus-routes.json manifest
app.get('/manus-routes.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    version: 1,
    routes: [
      { path: '/', type: 'page', description: 'Hiccups Chaos Engineering Dashboard' },
      { path: '/e/:slug', type: 'api', description: 'Chaos fault-injection endpoint' },
      { path: '/e/:slug/*', type: 'api', description: 'Chaos fault-injection subpath' },
      { path: '/api/v1/endpoints', type: 'api', description: 'List and create chaos endpoints' },
      { path: '/api/v1/playground', type: 'api', description: 'Create instant 24h sandbox endpoint' },
      { path: '/api/v1/check-slug', type: 'api', description: 'Check slug availability' },
      { path: '/health', type: 'api', description: 'Health check' }
    ]
  });
});

// ==========================================
// 2. CHAOS ENGINE ENDPOINTS: /e/:slug and /e/:slug/*
// ==========================================
app.all(['/e/:slug', '/e/:slug/*'], async (req: Request, res: Response) => {
  const startTime = Date.now();
  const slug = (req.params.slug || '').toLowerCase().trim();
  let endpointId = slugToIdMap.get(slug);
  if (!endpointId) {
    restoreState();
    endpointId = slugToIdMap.get(slug);
  }
  // Secondary fallback: scan endpointsMap directly to find any match by slug
  if (!endpointId) {
    for (const ep of endpointsMap.values()) {
      if (ep && ep.slug && ep.slug.toLowerCase().trim() === slug) {
        endpointId = ep.id;
        slugToIdMap.set(slug, ep.id);
        break;
      }
    }
  }
  const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

  // Always set request ID
  res.setHeader('X-Hiccup-Request-Id', requestId);

  if (!endpointId) {
    res.setHeader('X-Hiccup-Behavior', 'not_found');
    res.setHeader('X-Faultline-Behavior', 'not_found');
    return res.status(404).json({
      success: false,
      error: "Hiccup Endpoint Not Found",
      slug,
      requestId,
      message: "The requested chaos slug does not exist or has expired.",
      hint: "Create a new chaos endpoint at the Hiccups dashboard."
    });
  }

  let endpoint = endpointsMap.get(endpointId);
  if (!endpoint) {
    restoreState();
    endpoint = endpointsMap.get(endpointId);
  }
  if (!endpoint) {
    res.setHeader('X-Hiccup-Behavior', 'missing_config');
    res.setHeader('X-Faultline-Behavior', 'missing_config');
    return res.status(404).json({ success: false, error: "Endpoint configuration missing", requestId });
  }

  // Check TTL expiration
  if (endpoint.expiresAt && new Date(endpoint.expiresAt).getTime() < Date.now()) {
    res.setHeader('X-Hiccup-Behavior', 'expired');
    res.setHeader('X-Faultline-Behavior', 'expired');
    return res.status(410).json({
      success: false,
      error: "Chaos Endpoint Expired",
      slug,
      requestId,
      message: "This anonymous sandbox endpoint has passed its 24-hour expiration TTL."
    });
  }

  const clientIp = getClientIp(req);
  const subPath = req.params[0] ? `/${req.params[0]}` : '/';

  // Helper to set canonical and legacy behavior response headers
  const setBehaviorHeaders = (behavior: string) => {
    res.setHeader('X-Hiccup-Behavior', behavior);
    res.setHeader('X-Faultline-Behavior', behavior); // legacy compatibility
  };

  // Check Master Flaky Percentage Switch
  const roll = Math.random() * 100;
  const isFlakyTriggered = roll < endpoint.flakyPercentage;

  if (!isFlakyTriggered) {
    // Clean, normal response
    const durationMs = Date.now() - startTime;
    setBehaviorHeaders('none_clean');
    res.status(endpoint.defaultResponseStatus || 200);
    res.setHeader('Content-Type', 'application/json');
    res.send(endpoint.defaultResponseBody);

    addLog(endpoint.id, {
      slug: endpoint.slug,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: subPath,
      clientIp,
      userAgent: req.headers['user-agent'],
      behaviorApplied: 'none_clean',
      httpStatusReturned: endpoint.defaultResponseStatus || 200,
      durationMs
    });
    return;
  }

  // Find enabled rules
  const enabledRules = endpoint.rules.filter(r => r.enabled);
  // Roll probability for enabled rules
  const activeRules = enabledRules.filter(r => Math.random() <= r.probability);

  const findRule = (type: BehaviorType) => activeRules.find(r => r.type === type);

  // 1. Rate Limiting Check (Token Bucket)
  const rateLimitRule = findRule('rate_limit');
  if (rateLimitRule && rateLimitRule.params.rateLimit) {
    const rlParams = rateLimitRule.params.rateLimit;
    const key = `${endpoint.id}:${clientIp}`;
    const now = Date.now();
    let rlData = rateLimitMap.get(key);

    if (!rlData) {
      rlData = { tokens: rlParams.maxRequestsPerMin, lastRefill: now };
    } else {
      const elapsedMinutes = (now - rlData.lastRefill) / 60000;
      const refill = elapsedMinutes * rlParams.maxRequestsPerMin;
      rlData.tokens = Math.min(rlParams.maxRequestsPerMin + rlParams.burstAllowance, rlData.tokens + refill);
      rlData.lastRefill = now;
    }

    if (rlData.tokens < 1) {
      rateLimitMap.set(key, rlData);
      const retryAfter = rlParams.retryAfterSeconds || 15;
      const durationMs = Date.now() - startTime;

      setBehaviorHeaders('rate_limit');
      res.setHeader('Retry-After', String(retryAfter));
      res.setHeader('X-RateLimit-Limit', String(rlParams.maxRequestsPerMin));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.status(429);

      const body = {
        hiccup: true,
        requestId,
        error: "Too Many Requests (429)",
        message: "Injected rate limit exceeded. Retry after specified seconds.",
        retryAfterSeconds: retryAfter
      };
      res.json(body);

      addLog(endpoint.id, {
        slug: endpoint.slug,
        timestamp: new Date().toISOString(),
        method: req.method,
        path: subPath,
        clientIp,
        userAgent: req.headers['user-agent'],
        behaviorApplied: 'rate_limit',
        httpStatusReturned: 429,
        durationMs,
        errorMessage: `429 Rate Limit Exceeded (Retry-After: ${retryAfter}s)`
      });
      return;
    }

    // Consume 1 token
    rlData.tokens -= 1;
    rateLimitMap.set(key, rlData);
  }

  // 2. Latency Injection (Bounded up to 30s)
  const latencyRule = findRule('latency');
  if (latencyRule && latencyRule.params.latency) {
    const { minMs, maxMs, jitter } = latencyRule.params.latency;
    let delay = Math.min(30000, Math.max(0, minMs + Math.random() * Math.max(0, maxMs - minMs)));
    if (jitter) {
      const jitterFactor = 0.8 + Math.random() * 0.4;
      delay = Math.round(delay * jitterFactor);
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // 3. Silent Connection Hang (Capped at 15s to prevent connection resource starvation)
  const hangRule = findRule('hang');
  if (hangRule && hangRule.params.hang) {
    const durationSeconds = Math.min(15, Math.max(1, hangRule.params.hang.durationSeconds || 15));
    const durationMsCap = durationSeconds * 1000;

    let aborted = false;
    const closeHandler = () => { aborted = true; };
    req.on('close', closeHandler);

    await new Promise(resolve => setTimeout(resolve, durationMsCap));
    req.off('close', closeHandler);

    const durationMs = Date.now() - startTime;
    addLog(endpoint.id, {
      slug: endpoint.slug,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: subPath,
      clientIp,
      userAgent: req.headers['user-agent'],
      behaviorApplied: 'hang',
      httpStatusReturned: 0,
      durationMs,
      errorMessage: aborted ? `Client aborted during hang` : `Socket held open for ${durationSeconds}s then terminated`
    });

    if (res.socket && !res.socket.destroyed) {
      res.socket.destroy();
    }
    return;
  }

  // 4. Connection Drop Simulation (Raw Socket Kill or Partial Stream Drop)
  const dropRule = findRule('drop');
  if (dropRule && dropRule.params.drop) {
    const { mode, bytesBeforeDrop } = dropRule.params.drop;
    const durationMs = Date.now() - startTime;

    if (mode === 'abrupt') {
      addLog(endpoint.id, {
        slug: endpoint.slug,
        timestamp: new Date().toISOString(),
        method: req.method,
        path: subPath,
        clientIp,
        userAgent: req.headers['user-agent'],
        behaviorApplied: 'drop',
        httpStatusReturned: 0,
        durationMs,
        errorMessage: "Abrupt Socket Destruction (TCP Reset / ECONNRESET)"
      });

      if (res.socket && !res.socket.destroyed) {
        res.socket.destroy();
      }
      return;
    } else {
      // Partial byte drop
      const bytesLimit = bytesBeforeDrop || 64;
      setBehaviorHeaders('drop_partial');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Length', '10000'); // Fake huge content-length to cause framing/parsing failure

      const partialData = `{"status": "processing", "requestId": "${requestId}", "payload": "${'x'.repeat(Math.max(10, bytesLimit - 30))}`;
      res.write(partialData);

      addLog(endpoint.id, {
        slug: endpoint.slug,
        timestamp: new Date().toISOString(),
        method: req.method,
        path: subPath,
        clientIp,
        userAgent: req.headers['user-agent'],
        behaviorApplied: 'drop',
        httpStatusReturned: 200,
        durationMs,
        errorMessage: `Partial response sent (${bytesLimit} bytes) then socket forcibly killed`
      });

      setTimeout(() => {
        if (res.socket && !res.socket.destroyed) {
          res.socket.destroy();
        }
      }, 50);
      return;
    }
  }

  // 5. Slow Drip Byte Streaming (Bounded to 512 bytes max)
  const dripRule = findRule('drip');
  if (dripRule && dripRule.params.drip) {
    const { chunkSizeBytes, delayMsPerChunk, totalBytes } = dripRule.params.drip;
    const chunkSize = Math.max(1, Math.min(64, chunkSizeBytes || 16));
    const delay = Math.max(50, Math.min(500, delayMsPerChunk || 150));
    const maxTotal = Math.min(512, Math.max(32, totalBytes || 256));

    setBehaviorHeaders('drip');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    let bytesSent = 0;
    let clientDisconnected = false;
    const onDisconnect = () => { clientDisconnected = true; };
    req.on('close', onDisconnect);

    while (bytesSent < maxTotal && !clientDisconnected) {
      const remaining = maxTotal - bytesSent;
      const size = Math.min(chunkSize, remaining);
      const chunk = '.'.repeat(size);
      res.write(chunk);
      bytesSent += size;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    req.off('close', onDisconnect);

    if (!clientDisconnected) {
      res.end(`\n[Hiccups Drip Stream Complete - ${bytesSent} bytes]\n`);
    }

    const durationMs = Date.now() - startTime;
    addLog(endpoint.id, {
      slug: endpoint.slug,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: subPath,
      clientIp,
      userAgent: req.headers['user-agent'],
      behaviorApplied: 'drip',
      httpStatusReturned: 200,
      durationMs,
      details: { bytesSent, delayMsPerChunk: delay }
    });
    return;
  }

  // 6. Malformed JSON Response (HTTP 200 with invalid syntax)
  const malformedRule = findRule('malformed');
  if (malformedRule) {
    const durationMs = Date.now() - startTime;
    setBehaviorHeaders('malformed');
    res.status(200);
    res.setHeader('Content-Type', 'application/json');
    // Truncated, invalid JSON syntax
    res.send(`{"status": "ok", "requestId": "${requestId}", "items": [{"id": 101, "name": "Broken JSON"}, {"id": 102, `);

    addLog(endpoint.id, {
      slug: endpoint.slug,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: subPath,
      clientIp,
      userAgent: req.headers['user-agent'],
      behaviorApplied: 'malformed',
      httpStatusReturned: 200,
      durationMs,
      errorMessage: "Malformed JSON payload injected (Truncated syntax)"
    });
    return;
  }

  // 7. Redirect Loop
  const redirectRule = findRule('redirect_loop');
  if (redirectRule) {
    const stepQuery = parseInt(req.query.step as string) || 1;
    const nextStep = stepQuery + 1;
    const durationMs = Date.now() - startTime;

    setBehaviorHeaders('redirect_loop');
    res.status(302);
    res.setHeader('Location', `/e/${slug}/loop?step=${nextStep}`);
    res.send(`Redirecting to step ${nextStep}...`);

    addLog(endpoint.id, {
      slug: endpoint.slug,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: subPath,
      clientIp,
      userAgent: req.headers['user-agent'],
      behaviorApplied: 'redirect_loop',
      httpStatusReturned: 302,
      durationMs,
      details: { step: stepQuery }
    });
    return;
  }

  // 8. HTTP Error Code Injection (503, 500, 502, 504, 400, 401, 403, 404, 409, 429)
  const errorRule = findRule('error');
  if (errorRule && errorRule.params.error) {
    const { statusCode, customBody, customHeaderKey, customHeaderValue } = errorRule.params.error;
    const status = statusCode || 503;
    const durationMs = Date.now() - startTime;

    setBehaviorHeaders('error');
    res.status(status);

    if (customHeaderKey && customHeaderValue) {
      res.setHeader(customHeaderKey, customHeaderValue);
    }

    let responseContent = customBody;
    if (!responseContent) {
      responseContent = JSON.stringify(
        {
          hiccup: true,
          requestId,
          error: `Injected HTTP ${status}`,
          statusCode: status,
          message: "Hiccups chaos rule triggered error response"
        },
        null,
        2
      );
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(responseContent);

    addLog(endpoint.id, {
      slug: endpoint.slug,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: subPath,
      clientIp,
      userAgent: req.headers['user-agent'],
      behaviorApplied: 'error',
      httpStatusReturned: status,
      durationMs,
      errorMessage: `Injected HTTP ${status}`
    });
    return;
  }

  // Fallback: clean response
  const durationMs = Date.now() - startTime;
  setBehaviorHeaders('none_clean');
  res.status(endpoint.defaultResponseStatus || 200);
  res.setHeader('Content-Type', 'application/json');
  res.send(endpoint.defaultResponseBody);

  addLog(endpoint.id, {
    slug: endpoint.slug,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: subPath,
    clientIp,
    userAgent: req.headers['user-agent'],
    behaviorApplied: 'none_clean',
    httpStatusReturned: endpoint.defaultResponseStatus || 200,
    durationMs
  });
});

// ==========================================
// 3. CONTROL PLANE API ENDPOINTS (/api/v1/...)
// ==========================================

// Rate limit helper for endpoint creation (30 creations/minute per IP)
function checkCreationRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const entry = creationRateLimitMap.get(clientIp);
  if (!entry || entry.resetAt < now) {
    creationRateLimitMap.set(clientIp, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 30) {
    return false;
  }
  entry.count += 1;
  return true;
}

// Create Instant 24-Hour Sandbox Endpoint
app.post('/api/v1/playground', (req: Request, res: Response) => {
  restoreState();
  const clientIp = getClientIp(req);
  if (!checkCreationRateLimit(clientIp)) {
    return res.status(429).json({ success: false, error: "Rate limit exceeded. Please wait a minute before creating more endpoints." });
  }

  const sessionId = getSessionId(req);
  let customSlug = generateSlug();
  while (slugToIdMap.has(customSlug) || RESERVED_SLUGS.has(customSlug)) {
    customSlug = generateSlug();
  }

  const { presetId } = req.body || {};
  let rules = createDefaultRules();
  let flakyPercentage = 60;
  let endpointName = '24h Quick Sandbox';

  if (presetId) {
    const preset = PRESET_PROFILES.find(p => p.id === presetId);
    if (preset) {
      rules = JSON.parse(JSON.stringify(preset.rules));
      flakyPercentage = preset.flakyPercentage;
      endpointName = `Sandbox (${preset.name})`;
    }
  }

  const managementToken = `mgm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const newEndpoint: ChaosEndpoint = {
    id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    slug: customSlug,
    name: endpointName,
    isAnonymous: true,
    ownerSessionId: sessionId || undefined,
    managementToken,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours TTL
    flakyPercentage,
    defaultResponseStatus: 200,
    defaultResponseBody: JSON.stringify(
      { status: "success", data: "Clean response from your Hiccups sandbox endpoint." },
      null,
      2
    ),
    rules
  };

  endpointsMap.set(newEndpoint.id, newEndpoint);
  slugToIdMap.set(customSlug.toLowerCase().trim(), newEndpoint.id);
  logsMap.set(newEndpoint.id, []);
  persistState();

  res.status(201).json({ success: true, endpoint: newEndpoint });
});

// Create Named / Persistent Endpoint
app.post('/api/v1/endpoints', (req: Request, res: Response) => {
  restoreState();
  const clientIp = getClientIp(req);
  if (!checkCreationRateLimit(clientIp)) {
    return res.status(429).json({ success: false, error: "Rate limit exceeded. Please wait a minute before creating more endpoints." });
  }

  const sessionId = getSessionId(req);
  const { name, customSlug, presetId } = req.body || {};

  let slug: string;
  if (customSlug && typeof customSlug === 'string') {
    const normalized = customSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (normalized.length < 3 || normalized.length > 50) {
      return res.status(400).json({ success: false, error: "Slug must be between 3 and 50 characters." });
    }
    if (RESERVED_SLUGS.has(normalized)) {
      return res.status(400).json({ success: false, error: `The slug '${normalized}' is reserved by the system.` });
    }
    if (slugToIdMap.has(normalized)) {
      return res.status(409).json({ success: false, error: `Slug '${normalized}' is already taken.` });
    }
    slug = normalized;
  } else {
    slug = generateSlug();
    while (slugToIdMap.has(slug) || RESERVED_SLUGS.has(slug)) {
      slug = generateSlug();
    }
  }

  let rules = createDefaultRules();
  let flakyPercentage = 50;

  if (presetId) {
    const preset = PRESET_PROFILES.find(p => p.id === presetId);
    if (preset) {
      rules = JSON.parse(JSON.stringify(preset.rules));
      flakyPercentage = preset.flakyPercentage;
    }
  }

  const managementToken = `mgm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const newEndpoint: ChaosEndpoint = {
    id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    slug,
    name: (name && typeof name === 'string' && name.trim()) ? name.trim().slice(0, 60) : `Chaos Endpoint ${slug}`,
    isAnonymous: false,
    ownerSessionId: sessionId || undefined,
    managementToken,
    createdAt: new Date().toISOString(),
    expiresAt: null, // Persistent
    flakyPercentage,
    defaultResponseStatus: 200,
    defaultResponseBody: JSON.stringify(
      { status: "success", message: "Normal response from Hiccups chaos endpoint." },
      null,
      2
    ),
    rules
  };

  endpointsMap.set(newEndpoint.id, newEndpoint);
  slugToIdMap.set(slug.toLowerCase().trim(), newEndpoint.id);
  logsMap.set(newEndpoint.id, []);
  persistState();

  res.status(201).json({ success: true, endpoint: newEndpoint });
});

// Check if a Custom Slug is Available
app.get('/api/v1/check-slug', (req: Request, res: Response) => {
  restoreState();
  const rawSlug = (req.query.slug as string || '').toLowerCase().trim();
  if (!rawSlug) {
    return res.json({ available: false, error: "Slug cannot be empty" });
  }
  if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]?$/.test(rawSlug)) {
    return res.json({ available: false, error: "Only lowercase alphanumeric characters and hyphens allowed (3-50 chars)" });
  }
  if (RESERVED_SLUGS.has(rawSlug)) {
    return res.json({ available: false, taken: true, error: "This slug is reserved for system routes" });
  }

  const isTaken = slugToIdMap.has(rawSlug);
  res.json({ available: !isTaken, taken: isTaken });
});

// List Endpoints - Scoped to the requesting anonymous session + public demo endpoint
app.get('/api/v1/endpoints', (req: Request, res: Response) => {
  restoreState();
  const sessionId = getSessionId(req);
  const all = Array.from(endpointsMap.values());

  // Filter: include endpoints owned by this session OR the seeded demo endpoint
  const filtered = all.filter(ep => {
    if (ep.isDemo) return true;
    if (sessionId && ep.ownerSessionId === sessionId) return true;
    // If no session ID provided or endpoint has no owner, only show if created without session
    return !ep.ownerSessionId;
  });

  // Never leak management tokens to unauthorized callers
  const sanitized = filtered.map(ep => {
    if (ep.ownerSessionId && ep.ownerSessionId !== sessionId) {
      const { managementToken, ...safe } = ep;
      return safe;
    }
    return ep;
  });

  res.json({ success: true, endpoints: sanitized });
});

// Sync/Restore Endpoints from Authorized Session (Multi-container & Serverless resilience)
app.post('/api/v1/endpoints/sync', (req: Request, res: Response) => {
  restoreState();
  const sessionId = getSessionId(req);

  const { endpoints: syncList } = req.body || {};
  if (!Array.isArray(syncList)) {
    return res.status(400).json({ success: false, error: "endpoints must be an array" });
  }

  let restoredCount = 0;
  for (const ep of syncList) {
    if (ep && ep.id && ep.slug) {
      const cleanSlug = ep.slug.toLowerCase().trim();
      const existing = endpointsMap.get(ep.id);
      if (!existing) {
        endpointsMap.set(ep.id, {
          ...ep,
          slug: cleanSlug,
          ownerSessionId: ep.ownerSessionId || sessionId || undefined
        });
        slugToIdMap.set(cleanSlug, ep.id);
        restoredCount++;
      } else {
        // Update rules/configuration if caller owns it or if ownerSessionId was unset
        if (!existing.ownerSessionId || (sessionId && existing.ownerSessionId === sessionId)) {
          if (Array.isArray(ep.rules)) existing.rules = ep.rules;
          if (ep.flakyPercentage !== undefined) existing.flakyPercentage = ep.flakyPercentage;
          if (ep.name) existing.name = ep.name;
          endpointsMap.set(existing.id, existing);
          slugToIdMap.set(cleanSlug, existing.id);
          restoredCount++;
        }
      }
    }
  }

  if (restoredCount > 0) {
    persistState();
  }

  res.json({ success: true, restoredCount });
});

// Helper to authorize endpoint mutations
function authorizeEndpoint(req: Request, endpoint: ChaosEndpoint): { authorized: boolean; reason?: string } {
  if (endpoint.isDemo) {
    return { authorized: false, reason: "The demo endpoint is read-only. Create your own sandbox endpoint to edit rules." };
  }
  const sessionId = getSessionId(req);
  const mgmHeader = (req.headers['x-management-token'] as string) || 
                    (req.headers['x-hiccup-management-token'] as string) || '';
  const authHeader = (req.headers['authorization'] as string) || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : '';

  if (endpoint.ownerSessionId) {
    if (sessionId && endpoint.ownerSessionId === sessionId) {
      return { authorized: true };
    }
    if (mgmHeader && endpoint.managementToken === mgmHeader) {
      return { authorized: true };
    }
    if (bearerToken && endpoint.managementToken === bearerToken) {
      return { authorized: true };
    }
    return { authorized: false, reason: "Unauthorized: You do not own this endpoint." };
  }

  // Endpoints without owner session are open to caller
  return { authorized: true };
}

// Get Single Endpoint Details
app.get('/api/v1/endpoints/:id', (req: Request, res: Response) => {
  let endpoint = endpointsMap.get(req.params.id);
  if (!endpoint) {
    restoreState();
    endpoint = endpointsMap.get(req.params.id);
  }
  if (!endpoint) {
    return res.status(404).json({ success: false, error: "Endpoint not found" });
  }
  res.json({ success: true, endpoint });
});

// Update Endpoint Configuration
app.patch('/api/v1/endpoints/:id', (req: Request, res: Response) => {
  let endpoint = endpointsMap.get(req.params.id);
  if (!endpoint) {
    restoreState();
    endpoint = endpointsMap.get(req.params.id);
  }
  if (!endpoint) {
    return res.status(404).json({ success: false, error: "Endpoint not found" });
  }

  const auth = authorizeEndpoint(req, endpoint);
  if (!auth.authorized) {
    return res.status(403).json({ success: false, error: auth.reason });
  }

  const { name, flakyPercentage, defaultResponseStatus, defaultResponseBody, rules } = req.body || {};

  if (name !== undefined && typeof name === 'string') endpoint.name = name.slice(0, 60);
  if (flakyPercentage !== undefined && typeof flakyPercentage === 'number') {
    endpoint.flakyPercentage = Math.min(100, Math.max(0, flakyPercentage));
  }
  if (defaultResponseStatus !== undefined && typeof defaultResponseStatus === 'number') {
    endpoint.defaultResponseStatus = defaultResponseStatus;
  }
  if (defaultResponseBody !== undefined && typeof defaultResponseBody === 'string') {
    endpoint.defaultResponseBody = defaultResponseBody.slice(0, 16384);
  }
  if (rules !== undefined && Array.isArray(rules)) {
    endpoint.rules = rules;
  }

  endpointsMap.set(endpoint.id, endpoint);
  persistState();
  res.json({ success: true, endpoint });
});

// Update Specific Chaos Rule on Endpoint
app.patch('/api/v1/endpoints/:id/rules/:ruleId', (req: Request, res: Response) => {
  let endpoint = endpointsMap.get(req.params.id);
  if (!endpoint) {
    restoreState();
    endpoint = endpointsMap.get(req.params.id);
  }
  if (!endpoint) {
    return res.status(404).json({ success: false, error: "Endpoint not found" });
  }

  const auth = authorizeEndpoint(req, endpoint);
  if (!auth.authorized) {
    return res.status(403).json({ success: false, error: auth.reason });
  }

  const ruleIdParam = req.params.ruleId;
  const rule = endpoint.rules.find(r => r.id === ruleIdParam || r.type === ruleIdParam);
  if (!rule) {
    return res.status(404).json({ success: false, error: `Rule '${ruleIdParam}' not found on endpoint` });
  }

  const { enabled, probability, params } = req.body || {};

  if (enabled !== undefined) {
    rule.enabled = Boolean(enabled);
  }
  if (probability !== undefined) {
    rule.probability = Math.min(1.0, Math.max(0, Number(probability)));
  }
  if (params && typeof params === 'object') {
    rule.params = {
      ...rule.params,
      ...params
    };
  }

  endpointsMap.set(endpoint.id, endpoint);
  persistState();
  res.json({ success: true, endpoint, rule });
});

// Delete Endpoint
app.delete('/api/v1/endpoints/:id', (req: Request, res: Response) => {
  let endpoint = endpointsMap.get(req.params.id);
  if (!endpoint) {
    restoreState();
    endpoint = endpointsMap.get(req.params.id);
  }
  if (!endpoint) {
    return res.status(404).json({ success: false, error: "Endpoint not found" });
  }

  const auth = authorizeEndpoint(req, endpoint);
  if (!auth.authorized) {
    return res.status(403).json({ success: false, error: auth.reason });
  }

  deletedEndpointIds.add(endpoint.id);
  slugToIdMap.delete(endpoint.slug.toLowerCase().trim());
  slugToIdMap.delete(endpoint.slug);
  endpointsMap.delete(endpoint.id);
  logsMap.delete(endpoint.id);
  persistState();

  res.json({ success: true, message: "Endpoint deleted successfully" });
});

// Apply Preset Profile to Endpoint
app.post('/api/v1/endpoints/:id/apply-preset', (req: Request, res: Response) => {
  let endpoint = endpointsMap.get(req.params.id);
  if (!endpoint) {
    restoreState();
    endpoint = endpointsMap.get(req.params.id);
  }
  if (!endpoint) {
    return res.status(404).json({ success: false, error: "Endpoint not found" });
  }

  const auth = authorizeEndpoint(req, endpoint);
  if (!auth.authorized) {
    return res.status(403).json({ success: false, error: auth.reason });
  }

  const { presetId } = req.body || {};
  const preset = PRESET_PROFILES.find(p => p.id === presetId);
  if (!preset) {
    return res.status(404).json({ success: false, error: "Preset profile not found" });
  }

  endpoint.rules = JSON.parse(JSON.stringify(preset.rules));
  endpoint.flakyPercentage = preset.flakyPercentage;
  endpointsMap.set(endpoint.id, endpoint);
  persistState();

  res.json({ success: true, endpoint, message: `Applied preset '${preset.name}'` });
});

// Get Request Logs
app.get('/api/v1/endpoints/:id/logs', (req: Request, res: Response) => {
  let endpoint = endpointsMap.get(req.params.id);
  if (!endpoint) {
    restoreState();
    endpoint = endpointsMap.get(req.params.id);
  }
  if (!endpoint) {
    return res.status(404).json({ success: false, error: "Endpoint not found" });
  }
  const logs = logsMap.get(req.params.id) || [];
  res.json({ success: true, logs });
});

// Clear Request Logs
app.delete('/api/v1/endpoints/:id/logs', (req: Request, res: Response) => {
  let endpoint = endpointsMap.get(req.params.id);
  if (!endpoint) {
    restoreState();
    endpoint = endpointsMap.get(req.params.id);
  }
  if (!endpoint) {
    return res.status(404).json({ success: false, error: "Endpoint not found" });
  }

  const auth = authorizeEndpoint(req, endpoint);
  if (!auth.authorized) {
    return res.status(403).json({ success: false, error: auth.reason });
  }

  logsMap.set(req.params.id, []);
  res.json({ success: true, message: "Logs cleared" });
});

// Get Endpoint Telemetry Stats
app.get('/api/v1/endpoints/:id/stats', (req: Request, res: Response) => {
  let endpoint = endpointsMap.get(req.params.id);
  if (!endpoint) {
    restoreState();
    endpoint = endpointsMap.get(req.params.id);
  }
  if (!endpoint) {
    return res.status(404).json({ success: false, error: "Endpoint not found" });
  }

  const logs = logsMap.get(req.params.id) || [];
  const totalRequests = logs.length;
  let successRequests = 0;
  let faultRequests = 0;
  const latencies: number[] = [];

  const behaviorBreakdown: Record<BehaviorType | 'none_clean', number> = {
    none_clean: 0,
    latency: 0,
    error: 0,
    drop: 0,
    hang: 0,
    rate_limit: 0,
    drip: 0,
    malformed: 0,
    redirect_loop: 0
  };

  logs.forEach(log => {
    latencies.push(log.durationMs);
    behaviorBreakdown[log.behaviorApplied] = (behaviorBreakdown[log.behaviorApplied] || 0) + 1;
    if (log.behaviorApplied === 'none_clean') {
      successRequests++;
    } else {
      faultRequests++;
    }
  });

  latencies.sort((a, b) => a - b);
  const p50 = latencies.length ? latencies[Math.floor(latencies.length * 0.5)] : 0;
  const p90 = latencies.length ? latencies[Math.floor(latencies.length * 0.9)] : 0;
  const p95 = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] : 0;

  const stats: EndpointStats = {
    totalRequests,
    successRequests,
    faultRequests,
    p50Latency: p50,
    p90Latency: p90,
    p95Latency: p95,
    behaviorBreakdown
  };

  res.json({ success: true, stats });
});

// Explicit 404 for unhandled API routes (prevents Vite HTML SPA fallback)
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ success: false, error: `API route not found: ${req.method} ${req.originalUrl}` });
});
