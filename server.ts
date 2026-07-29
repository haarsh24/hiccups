import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ChaosEndpoint, RequestLog, EndpointStats, ChaosRule, BehaviorType } from './src/types';
import { PRESET_PROFILES } from './src/data/presets';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable permissive CORS for chaos endpoints & control plane
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Expose-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// In-Memory Storage Engine
const endpointsMap = new Map<string, ChaosEndpoint>(); // key: endpoint id
const slugToIdMap = new Map<string, string>(); // key: slug -> endpoint id
const logsMap = new Map<string, RequestLog[]>(); // key: endpoint id -> array of logs
const rateLimitMap = new Map<string, { tokens: number; lastRefill: number }>(); // key: endpointId:clientIp

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
function createDefaultRules(): ChaosRule[] {
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
          customBody: JSON.stringify({ error: "Service Unavailable", code: "HICCUP_INJECTED_503", message: "Chaos rule triggered" }, null, 2)
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
        hang: { durationSeconds: 30 }
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
        drip: { chunkSizeBytes: 16, delayMsPerChunk: 200, totalBytes: 256 }
      }
    }
  ];
}

// Seed initial playground endpoint so app is immediately usable out of the box!
const initialSlug = 'demo-flaky-api';
const initialEndpoint: ChaosEndpoint = {
  id: 'ep-demo-initial',
  slug: initialSlug,
  name: 'Demo Flaky API Endpoint',
  isAnonymous: true,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  flakyPercentage: 50,
  defaultResponseStatus: 200,
  defaultResponseBody: JSON.stringify({ status: "ok", message: "Hello from Hiccup! This endpoint was reached successfully without chaos." }, null, 2),
  rules: createDefaultRules()
};
endpointsMap.set(initialEndpoint.id, initialEndpoint);
slugToIdMap.set(initialSlug, initialEndpoint.id);
logsMap.set(initialEndpoint.id, []);

// Utility to append log
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

// ==========================================
// 1. CHAOS ENGINE ENDPOINTS: /e/:slug and /e/:slug/*
// ==========================================
app.all(['/e/:slug', '/e/:slug/*'], async (req: Request, res: Response) => {
  const startTime = Date.now();
  const slug = req.params.slug;
  const endpointId = slugToIdMap.get(slug);

  if (!endpointId) {
    return res.status(404).json({
      hiccup: true,
      error: "Hiccup Endpoint Not Found",
      slug,
      message: "The requested chaos slug does not exist or has expired.",
      hint: "Create a new chaos endpoint at the Hiccup Dashboard."
    });
  }

  const endpoint = endpointsMap.get(endpointId);
  if (!endpoint) {
    return res.status(404).json({ error: "Endpoint configuration missing" });
  }

  // Check TTL expiration
  if (endpoint.expiresAt && new Date(endpoint.expiresAt).getTime() < Date.now()) {
    return res.status(410).json({
      hiccup: true,
      error: "Chaos Endpoint Expired",
      slug,
      message: "This anonymous playground endpoint has passed its expiration TTL."
    });
  }

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const subPath = req.params[0] ? `/${req.params[0]}` : '/';

  // Check Master Flaky Percentage Switch
  const roll = Math.random() * 100;
  const isFlakyTriggered = roll < endpoint.flakyPercentage;

  if (!isFlakyTriggered) {
    // Respond with normal clean default response
    const durationMs = Date.now() - startTime;
    res.status(endpoint.defaultResponseStatus);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Faultline-Behavior', 'none_clean');
    res.send(endpoint.defaultResponseBody);

    addLog(endpoint.id, {
      slug: endpoint.slug,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: subPath,
      clientIp,
      userAgent: req.headers['user-agent'],
      behaviorApplied: 'none_clean',
      httpStatusReturned: endpoint.defaultResponseStatus,
      durationMs
    });
    return;
  }

  // Find enabled rules
  const enabledRules = endpoint.rules.filter(r => r.enabled);
  // Pick active rules based on probability roll
  const activeRules = enabledRules.filter(r => Math.random() <= r.probability);

  // Helper to check for specific rule
  const findRule = (type: BehaviorType) => activeRules.find(r => r.type === type);

  // 1. Rate Limiting Check
  const rateLimitRule = findRule('rate_limit');
  if (rateLimitRule && rateLimitRule.params.rateLimit) {
    const rlParams = rateLimitRule.params.rateLimit;
    const key = `${endpoint.id}:${clientIp}`;
    const now = Date.now();
    let rlData = rateLimitMap.get(key);

    if (!rlData) {
      rlData = { tokens: rlParams.maxRequestsPerMin, lastRefill: now };
    } else {
      // Refill tokens based on elapsed time
      const elapsedMinutes = (now - rlData.lastRefill) / 60000;
      const refill = elapsedMinutes * rlParams.maxRequestsPerMin;
      rlData.tokens = Math.min(rlParams.maxRequestsPerMin + rlParams.burstAllowance, rlData.tokens + refill);
      rlData.lastRefill = now;
    }

    if (rlData.tokens < 1) {
      rateLimitMap.set(key, rlData);
      const retryAfter = rlParams.retryAfterSeconds || 15;
      const durationMs = Date.now() - startTime;

      res.status(429);
      res.setHeader('Retry-After', String(retryAfter));
      res.setHeader('X-RateLimit-Limit', String(rlParams.maxRequestsPerMin));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-Faultline-Behavior', 'rate_limit');

      const body = {
        faultline: true,
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

    // Consume token
    rlData.tokens -= 1;
    rateLimitMap.set(key, rlData);
  }

  // 2. Latency Injection
  const latencyRule = findRule('latency');
  if (latencyRule && latencyRule.params.latency) {
    const { minMs, maxMs, jitter } = latencyRule.params.latency;
    let delay = minMs + Math.random() * Math.max(0, maxMs - minMs);
    if (jitter) {
      const jitterFactor = 0.8 + Math.random() * 0.4;
      delay = Math.round(delay * jitterFactor);
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // 3. Hang / Timeout Simulation
  const hangRule = findRule('hang');
  if (hangRule && hangRule.params.hang) {
    const durationSeconds = Math.min(120, Math.max(1, hangRule.params.hang.durationSeconds || 30));
    const durationMsCap = durationSeconds * 1000;

    // Keep connection hanging open
    await new Promise(resolve => setTimeout(resolve, durationMsCap));

    // Abruptly destroy socket after hanging
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
      errorMessage: `Socket held open for ${durationSeconds}s then terminated`
    });

    if (res.socket) {
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

      if (res.socket) {
        res.socket.destroy();
      }
      return;
    } else {
      // Partial byte drop
      const bytesLimit = bytesBeforeDrop || 64;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Length', '10000'); // Fake huge content-length
      res.setHeader('X-Faultline-Behavior', 'drop_partial');

      // Write partial string then destroy
      const partialData = `{"status": "processing", "payload": "partial_data_stream_bytes_${'x'.repeat(Math.max(10, bytesLimit - 40))}`;
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
        if (res.socket) {
          res.socket.destroy();
        }
      }, 50);
      return;
    }
  }

  // 5. Slow Drip Byte Streaming
  const dripRule = findRule('drip');
  if (dripRule && dripRule.params.drip) {
    const { chunkSizeBytes, delayMsPerChunk, totalBytes } = dripRule.params.drip;
    const chunkSize = chunkSizeBytes || 16;
    const delay = delayMsPerChunk || 200;
    const maxTotal = totalBytes || 256;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Faultline-Behavior', 'drip');

    let bytesSent = 0;
    while (bytesSent < maxTotal) {
      const remaining = maxTotal - bytesSent;
      const size = Math.min(chunkSize, remaining);
      const chunk = 'x'.repeat(size);
      res.write(chunk);
      bytesSent += size;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const durationMs = Date.now() - startTime;
    res.end('\n[Faultline Drip Stream Complete]\n');

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

  // 6. Malformed JSON Response
  const malformedRule = findRule('malformed');
  if (malformedRule) {
    const durationMs = Date.now() - startTime;
    res.status(200);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Faultline-Behavior', 'malformed');
    // Send truncated invalid JSON syntax
    res.send('{"status": "ok", "items": [{"id": 101, "name": "Broken JSON"}, {"id": 102, ');

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
    const maxRedirects = redirectRule.params.redirect?.maxRedirects || 20;
    const nextStep = stepQuery + 1;
    const durationMs = Date.now() - startTime;

    res.status(302);
    res.setHeader('Location', `/e/${slug}/loop?step=${nextStep}`);
    res.setHeader('X-Faultline-Behavior', 'redirect_loop');
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
      details: { step: stepQuery, maxRedirects }
    });
    return;
  }

  // 8. HTTP Error Code Injection
  const errorRule = findRule('error');
  if (errorRule && errorRule.params.error) {
    const { statusCode, customBody, customHeaderKey, customHeaderValue } = errorRule.params.error;
    const durationMs = Date.now() - startTime;

    res.status(statusCode || 503);
    res.setHeader('X-Faultline-Behavior', 'error');
    if (customHeaderKey && customHeaderValue) {
      res.setHeader(customHeaderKey, customHeaderValue);
    }

    let responseContent = customBody;
    if (!responseContent) {
      responseContent = JSON.stringify({
        faultline: true,
        error: `Injected HTTP ${statusCode}`,
        statusCode,
        message: "Faultline rule triggered error response"
      }, null, 2);
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
      httpStatusReturned: statusCode || 503,
      durationMs,
      errorMessage: `Injected HTTP ${statusCode}`
    });
    return;
  }

  // Default fallback if no active behavior triggered despite flaky roll
  const durationMs = Date.now() - startTime;
  res.status(endpoint.defaultResponseStatus);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Faultline-Behavior', 'none_clean');
  res.send(endpoint.defaultResponseBody);

  addLog(endpoint.id, {
    slug: endpoint.slug,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: subPath,
    clientIp,
    userAgent: req.headers['user-agent'],
    behaviorApplied: 'none_clean',
    httpStatusReturned: endpoint.defaultResponseStatus,
    durationMs
  });
});

// ==========================================
// 2. CONTROL PLANE API ENDPOINTS (/api/v1/...)
// ==========================================

// Create Instant Anonymous Playground Endpoint
app.post('/api/v1/playground', (req: Request, res: Response) => {
  let customSlug = generateSlug();
  while (slugToIdMap.has(customSlug)) {
    customSlug = generateSlug();
  }

  const newEndpoint: ChaosEndpoint = {
    id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    slug: customSlug,
    name: 'Instant Chaos Playground',
    isAnonymous: true,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours TTL
    flakyPercentage: 60,
    defaultResponseStatus: 200,
    defaultResponseBody: JSON.stringify({ status: "success", data: "Clean response from your playground chaos endpoint." }, null, 2),
    rules: createDefaultRules()
  };

  endpointsMap.set(newEndpoint.id, newEndpoint);
  slugToIdMap.set(customSlug, newEndpoint.id);
  logsMap.set(newEndpoint.id, []);

  res.json({ success: true, endpoint: newEndpoint });
});

// Create Named / Saved Endpoint
app.post('/api/v1/endpoints', (req: Request, res: Response) => {
  const { name, customSlug, presetId } = req.body;

  let slug = customSlug ? customSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-') : generateSlug();
  if (slugToIdMap.has(slug)) {
    slug = `${slug}-${Math.floor(10 + Math.random() * 90)}`;
  }

  let rules = createDefaultRules();
  let flakyPercentage = 50;

  if (presetId) {
    const preset = PRESET_PROFILES.find(p => p.id === presetId);
    if (preset) {
      rules = preset.rules;
      flakyPercentage = preset.flakyPercentage;
    }
  }

  const newEndpoint: ChaosEndpoint = {
    id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    slug,
    name: name || `Chaos Endpoint ${slug}`,
    isAnonymous: false,
    createdAt: new Date().toISOString(),
    expiresAt: null, // Persistent
    flakyPercentage,
    defaultResponseStatus: 200,
    defaultResponseBody: JSON.stringify({ status: "success", message: "Normal response from Faultline chaos endpoint." }, null, 2),
    rules
  };

  endpointsMap.set(newEndpoint.id, newEndpoint);
  slugToIdMap.set(slug, newEndpoint.id);
  logsMap.set(newEndpoint.id, []);

  res.json({ success: true, endpoint: newEndpoint });
});

// List All Endpoints
app.get('/api/v1/endpoints', (req: Request, res: Response) => {
  const list = Array.from(endpointsMap.values());
  res.json({ success: true, endpoints: list });
});

// Get Single Endpoint Details
app.get('/api/v1/endpoints/:id', (req: Request, res: Response) => {
  const endpoint = endpointsMap.get(req.params.id);
  if (!endpoint) {
    return res.status(404).json({ error: "Endpoint not found" });
  }
  res.json({ success: true, endpoint });
});

// Update Endpoint Configuration
app.patch('/api/v1/endpoints/:id', (req: Request, res: Response) => {
  const endpoint = endpointsMap.get(req.params.id);
  if (!endpoint) {
    return res.status(404).json({ error: "Endpoint not found" });
  }

  const { name, flakyPercentage, defaultResponseStatus, defaultResponseBody, rules } = req.body;

  if (name !== undefined) endpoint.name = name;
  if (flakyPercentage !== undefined) endpoint.flakyPercentage = Math.min(100, Math.max(0, flakyPercentage));
  if (defaultResponseStatus !== undefined) endpoint.defaultResponseStatus = defaultResponseStatus;
  if (defaultResponseBody !== undefined) endpoint.defaultResponseBody = defaultResponseBody;
  if (rules !== undefined) endpoint.rules = rules;

  endpointsMap.set(endpoint.id, endpoint);
  res.json({ success: true, endpoint });
});

// Delete Endpoint
app.delete('/api/v1/endpoints/:id', (req: Request, res: Response) => {
  const endpoint = endpointsMap.get(req.params.id);
  if (!endpoint) {
    return res.status(404).json({ error: "Endpoint not found" });
  }

  slugToIdMap.delete(endpoint.slug);
  endpointsMap.delete(endpoint.id);
  logsMap.delete(endpoint.id);

  res.json({ success: true, message: "Endpoint deleted successfully" });
});

// Apply Preset Profile to Endpoint
app.post('/api/v1/endpoints/:id/apply-preset', (req: Request, res: Response) => {
  const endpoint = endpointsMap.get(req.params.id);
  if (!endpoint) {
    return res.status(404).json({ error: "Endpoint not found" });
  }

  const { presetId } = req.body;
  const preset = PRESET_PROFILES.find(p => p.id === presetId);
  if (!preset) {
    return res.status(404).json({ error: "Preset not found" });
  }

  endpoint.rules = JSON.parse(JSON.stringify(preset.rules));
  endpoint.flakyPercentage = preset.flakyPercentage;
  endpointsMap.set(endpoint.id, endpoint);

  res.json({ success: true, endpoint, message: `Applied preset '${preset.name}'` });
});

// Get Request Logs
app.get('/api/v1/endpoints/:id/logs', (req: Request, res: Response) => {
  const logs = logsMap.get(req.params.id) || [];
  res.json({ success: true, logs });
});

// Clear Request Logs
app.delete('/api/v1/endpoints/:id/logs', (req: Request, res: Response) => {
  logsMap.set(req.params.id, []);
  res.json({ success: true, message: "Logs cleared" });
});

// Get Endpoint Telemetry Stats
app.get('/api/v1/endpoints/:id/stats', (req: Request, res: Response) => {
  const endpoint = endpointsMap.get(req.params.id);
  if (!endpoint) {
    return res.status(404).json({ error: "Endpoint not found" });
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

// ==========================================
// 3. FRONTEND SERVING & DEV SERVER
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Faultline Chaos Engine server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
