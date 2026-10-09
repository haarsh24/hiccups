var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_path2 = __toESM(require("path"), 1);
var import_express2 = __toESM(require("express"), 1);
var import_vite = require("vite");

// src/server/app.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_os = __toESM(require("os"), 1);

// src/data/presets.ts
var PRESET_PROFILES = [
  {
    id: "flaky-payment-gateway",
    name: "Flaky Payment Gateway",
    tagline: "30% random 503 & 429 errors with 800ms-2500ms jittered latency",
    iconName: "CreditCard",
    description: "Simulate an unreliable third-party payment provider like Stripe or PayPal during peak traffic spikes.",
    flakyPercentage: 40,
    rules: [
      {
        id: "r-lat-1",
        type: "latency",
        enabled: true,
        probability: 0.8,
        params: {
          latency: { minMs: 800, maxMs: 2500, jitter: true }
        }
      },
      {
        id: "r-err-1",
        type: "error",
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
    id: "abrupt-socket-drop",
    name: "Mid-Stream Connection Reset",
    tagline: "Terminates TCP connection abruptly after sending partial bytes",
    iconName: "Unplug",
    description: "Tests if your client handles raw ECONNRESET or socket hanging without crashing background workers.",
    flakyPercentage: 75,
    rules: [
      {
        id: "r-drop-1",
        type: "drop",
        enabled: true,
        probability: 1,
        params: {
          drop: { mode: "partial", bytesBeforeDrop: 64 }
        }
      }
    ]
  },
  {
    id: "aggressive-rate-limiter",
    name: "Aggressive Rate Limiter (429)",
    tagline: "Enforces strict token bucket of 5 reqs/min with Retry-After header",
    iconName: "ShieldAlert",
    description: "Validates exponential backoff and compliance with HTTP 429 Retry-After response headers.",
    flakyPercentage: 100,
    rules: [
      {
        id: "r-rl-1",
        type: "rate_limit",
        enabled: true,
        probability: 1,
        params: {
          rateLimit: { maxRequestsPerMin: 5, burstAllowance: 2, retryAfterSeconds: 30 }
        }
      }
    ]
  },
  {
    id: "drip-slow-streaming",
    name: "Slow Drip Byte Streaming",
    tagline: "Streams response 16 bytes every 250ms (slow read stream)",
    iconName: "Gauge",
    description: "Tests socket read timeout thresholds when a server connects quickly but transmits payload sluggishly.",
    flakyPercentage: 100,
    rules: [
      {
        id: "r-drip-1",
        type: "drip",
        enabled: true,
        probability: 1,
        params: {
          drip: { chunkSizeBytes: 16, delayMsPerChunk: 250, totalBytes: 256 }
        }
      }
    ]
  },
  {
    id: "hang-timeout-ghost",
    name: "45-Second Connection Hang",
    tagline: "Holds HTTP connection open silently to trigger HTTP client timeouts",
    iconName: "Clock",
    description: "Verifies whether client-side timeout settings (e.g. 5s or 10s) trigger properly before hanging threads.",
    flakyPercentage: 100,
    rules: [
      {
        id: "r-hang-1",
        type: "hang",
        enabled: true,
        probability: 1,
        params: {
          hang: { durationSeconds: 45 }
        }
      }
    ]
  },
  {
    id: "malformed-json-payload",
    name: "Malformed JSON Syntactic Error",
    tagline: "Returns 200 OK with Content-Type: application/json but truncated JSON syntax",
    iconName: "FileCode2",
    description: "Tests if your JSON parser safely catches syntax errors instead of throwing unhandled uncaught exceptions.",
    flakyPercentage: 100,
    rules: [
      {
        id: "r-mal-1",
        type: "malformed",
        enabled: true,
        probability: 1,
        params: {}
      }
    ]
  },
  {
    id: "infinite-redirect-loop",
    name: "Infinite Redirect Loop (302)",
    tagline: "Returns 302 redirects in an endless loop back to itself",
    iconName: "RefreshCw",
    description: "Verifies maximum redirect depth limits in curl, fetch, and HTTP clients.",
    flakyPercentage: 100,
    rules: [
      {
        id: "r-red-1",
        type: "redirect_loop",
        enabled: true,
        probability: 1,
        params: {
          redirect: { maxRedirects: 20 }
        }
      }
    ]
  }
];

// src/server/app.ts
var app = (0, import_express.default)();
app.use(import_express.default.json({ limit: "64kb" }));
app.use(import_express.default.text({ limit: "64kb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "64kb" }));
app.use((req, res, next) => {
  try {
    const urlObj = new URL(req.url, "http://localhost");
    const vPath = urlObj.searchParams.get("__v_path");
    const matchedPath = req.headers["x-matched-path"] || req.headers["x-vercel-matched-path"];
    const originalUrl = req.headers["x-vercel-original-url"];
    if (vPath) {
      urlObj.searchParams.delete("__v_path");
      const search = urlObj.search ? urlObj.search : "";
      req.url = vPath + search;
    } else if (matchedPath && (req.url === "/api" || req.url === "/api/" || req.url.startsWith("/api?"))) {
      const search = urlObj.search ? urlObj.search : "";
      req.url = matchedPath + search;
    } else if (originalUrl && (req.url === "/api" || req.url === "/api/" || req.url.startsWith("/api?"))) {
      req.url = originalUrl;
    }
  } catch {
  }
  next();
});
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Hiccup-Test-Client, X-Hiccup-Session-Id, X-Management-Token, X-Hiccup-Management-Token, x-hiccup-behavior, x-faultline-behavior, *"
  );
  res.header(
    "Access-Control-Expose-Headers",
    "x-hiccup-behavior, x-hiccup-request-id, x-faultline-behavior, retry-after, content-length, content-type, x-management-token, x-hiccup-management-token, *"
  );
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});
var endpointsMap = /* @__PURE__ */ new Map();
var slugToIdMap = /* @__PURE__ */ new Map();
var logsMap = /* @__PURE__ */ new Map();
var rateLimitMap = /* @__PURE__ */ new Map();
var creationRateLimitMap = /* @__PURE__ */ new Map();
var DATA_FILE = import_path.default.join(process.env.DATA_DIR || import_os.default.tmpdir(), "hiccups_state_store.json");
function persistState() {
  try {
    const data = {
      endpoints: Array.from(endpointsMap.values()),
      slugs: Array.from(slugToIdMap.entries())
    };
    import_fs.default.writeFileSync(DATA_FILE, JSON.stringify(data), "utf-8");
  } catch {
  }
}
function restoreState() {
  try {
    if (import_fs.default.existsSync(DATA_FILE)) {
      const raw = import_fs.default.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.endpoints)) {
        for (const ep of parsed.endpoints) {
          endpointsMap.set(ep.id, ep);
        }
      }
      if (Array.isArray(parsed.slugs)) {
        for (const [slug, id] of parsed.slugs) {
          slugToIdMap.set(slug, id);
        }
      }
    }
  } catch {
  }
}
var RESERVED_SLUGS = /* @__PURE__ */ new Set([
  "api",
  "e",
  "health",
  "robots.txt",
  "manus-routes.json",
  "assets",
  "static",
  "favicon.ico",
  "admin",
  "dashboard",
  "status",
  "index.html"
]);
function generateSlug() {
  const adjectives = ["flaky", "choppy", "jittery", "rocky", "faulty", "turbulent", "unstable", "broken", "sluggish", "ghostly"];
  const nouns = ["fox", "port", "node", "wave", "stream", "socket", "gate", "bridge", "pulse", "channel"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}-${noun}-${num}`;
}
function createDefaultRules() {
  return [
    {
      id: `r-lat-${Date.now()}`,
      type: "latency",
      enabled: true,
      probability: 0.7,
      params: {
        latency: { minMs: 500, maxMs: 2e3, jitter: true }
      }
    },
    {
      id: `r-err-${Date.now()}`,
      type: "error",
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
      type: "drop",
      enabled: false,
      probability: 0.2,
      params: {
        drop: { mode: "partial", bytesBeforeDrop: 64 }
      }
    },
    {
      id: `r-hang-${Date.now()}`,
      type: "hang",
      enabled: false,
      probability: 0.1,
      params: {
        hang: { durationSeconds: 15 }
        // bounded cap 15s
      }
    },
    {
      id: `r-rl-${Date.now()}`,
      type: "rate_limit",
      enabled: false,
      probability: 1,
      params: {
        rateLimit: { maxRequestsPerMin: 10, burstAllowance: 2, retryAfterSeconds: 15 }
      }
    },
    {
      id: `r-drip-${Date.now()}`,
      type: "drip",
      enabled: false,
      probability: 0.5,
      params: {
        drip: { chunkSizeBytes: 16, delayMsPerChunk: 150, totalBytes: 256 }
      }
    }
  ];
}
var demoSlug = "demo-chaos";
var demoEndpoint = {
  id: "ep-demo-chaos",
  slug: demoSlug,
  name: "Demo Chaos Endpoint",
  isAnonymous: false,
  isDemo: true,
  createdAt: (/* @__PURE__ */ new Date()).toISOString(),
  expiresAt: null,
  // permanent
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
slugToIdMap.set("demo-flaky-api", demoEndpoint.id);
logsMap.set(demoEndpoint.id, []);
restoreState();
function addLog(endpointId, log) {
  const logs = logsMap.get(endpointId) || [];
  const newLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    endpointId,
    ...log
  };
  logs.unshift(newLog);
  if (logs.length > 150) {
    logs.pop();
  }
  logsMap.set(endpointId, logs);
}
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "127.0.0.1";
}
function getSessionId(req) {
  const header = req.headers["x-hiccup-session-id"] || "";
  if (header && typeof header === "string" && header.trim().length > 0) {
    return header.trim().slice(0, 64);
  }
  const auth = req.headers["authorization"] || "";
  if (auth.startsWith("Bearer ")) {
    return auth.replace("Bearer ", "").trim().slice(0, 64);
  }
  return "";
}
app.get(["/health", "/api/v1/health"], (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json({
    status: "ok",
    service: "Hiccups Chaos Engine",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/robots.txt", (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send("User-agent: *\nAllow: /\nDisallow: /e/\nDisallow: /api/\n");
});
app.get("/manus-routes.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json({
    version: 1,
    routes: [
      { path: "/", type: "page", description: "Hiccups Chaos Engineering Dashboard" },
      { path: "/e/:slug", type: "api", description: "Chaos fault-injection endpoint" },
      { path: "/e/:slug/*", type: "api", description: "Chaos fault-injection subpath" },
      { path: "/api/v1/endpoints", type: "api", description: "List and create chaos endpoints" },
      { path: "/api/v1/playground", type: "api", description: "Create instant 24h sandbox endpoint" },
      { path: "/api/v1/check-slug", type: "api", description: "Check slug availability" },
      { path: "/health", type: "api", description: "Health check" }
    ]
  });
});
app.all(["/e/:slug", "/e/:slug/*"], async (req, res) => {
  const startTime = Date.now();
  const slug = (req.params.slug || "").toLowerCase().trim();
  let endpointId = slugToIdMap.get(slug);
  if (!endpointId) {
    restoreState();
    endpointId = slugToIdMap.get(slug);
  }
  const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  res.setHeader("X-Hiccup-Request-Id", requestId);
  if (!endpointId) {
    res.setHeader("X-Hiccup-Behavior", "not_found");
    res.setHeader("X-Faultline-Behavior", "not_found");
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
    res.setHeader("X-Hiccup-Behavior", "missing_config");
    res.setHeader("X-Faultline-Behavior", "missing_config");
    return res.status(404).json({ success: false, error: "Endpoint configuration missing", requestId });
  }
  if (endpoint.expiresAt && new Date(endpoint.expiresAt).getTime() < Date.now()) {
    res.setHeader("X-Hiccup-Behavior", "expired");
    res.setHeader("X-Faultline-Behavior", "expired");
    return res.status(410).json({
      success: false,
      error: "Chaos Endpoint Expired",
      slug,
      requestId,
      message: "This anonymous sandbox endpoint has passed its 24-hour expiration TTL."
    });
  }
  const clientIp = getClientIp(req);
  const subPath = req.params[0] ? `/${req.params[0]}` : "/";
  const setBehaviorHeaders = (behavior) => {
    res.setHeader("X-Hiccup-Behavior", behavior);
    res.setHeader("X-Faultline-Behavior", behavior);
  };
  const roll = Math.random() * 100;
  const isFlakyTriggered = roll < endpoint.flakyPercentage;
  if (!isFlakyTriggered) {
    const durationMs2 = Date.now() - startTime;
    setBehaviorHeaders("none_clean");
    res.status(endpoint.defaultResponseStatus || 200);
    res.setHeader("Content-Type", "application/json");
    res.send(endpoint.defaultResponseBody);
    addLog(endpoint.id, {
      slug: endpoint.slug,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      method: req.method,
      path: subPath,
      clientIp,
      userAgent: req.headers["user-agent"],
      behaviorApplied: "none_clean",
      httpStatusReturned: endpoint.defaultResponseStatus || 200,
      durationMs: durationMs2
    });
    return;
  }
  const enabledRules = endpoint.rules.filter((r) => r.enabled);
  const activeRules = enabledRules.filter((r) => Math.random() <= r.probability);
  const findRule = (type) => activeRules.find((r) => r.type === type);
  const rateLimitRule = findRule("rate_limit");
  if (rateLimitRule && rateLimitRule.params.rateLimit) {
    const rlParams = rateLimitRule.params.rateLimit;
    const key = `${endpoint.id}:${clientIp}`;
    const now = Date.now();
    let rlData = rateLimitMap.get(key);
    if (!rlData) {
      rlData = { tokens: rlParams.maxRequestsPerMin, lastRefill: now };
    } else {
      const elapsedMinutes = (now - rlData.lastRefill) / 6e4;
      const refill = elapsedMinutes * rlParams.maxRequestsPerMin;
      rlData.tokens = Math.min(rlParams.maxRequestsPerMin + rlParams.burstAllowance, rlData.tokens + refill);
      rlData.lastRefill = now;
    }
    if (rlData.tokens < 1) {
      rateLimitMap.set(key, rlData);
      const retryAfter = rlParams.retryAfterSeconds || 15;
      const durationMs2 = Date.now() - startTime;
      setBehaviorHeaders("rate_limit");
      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("X-RateLimit-Limit", String(rlParams.maxRequestsPerMin));
      res.setHeader("X-RateLimit-Remaining", "0");
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
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        method: req.method,
        path: subPath,
        clientIp,
        userAgent: req.headers["user-agent"],
        behaviorApplied: "rate_limit",
        httpStatusReturned: 429,
        durationMs: durationMs2,
        errorMessage: `429 Rate Limit Exceeded (Retry-After: ${retryAfter}s)`
      });
      return;
    }
    rlData.tokens -= 1;
    rateLimitMap.set(key, rlData);
  }
  const latencyRule = findRule("latency");
  if (latencyRule && latencyRule.params.latency) {
    const { minMs, maxMs, jitter } = latencyRule.params.latency;
    let delay = Math.min(3e4, Math.max(0, minMs + Math.random() * Math.max(0, maxMs - minMs)));
    if (jitter) {
      const jitterFactor = 0.8 + Math.random() * 0.4;
      delay = Math.round(delay * jitterFactor);
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  const hangRule = findRule("hang");
  if (hangRule && hangRule.params.hang) {
    const durationSeconds = Math.min(15, Math.max(1, hangRule.params.hang.durationSeconds || 15));
    const durationMsCap = durationSeconds * 1e3;
    let aborted = false;
    const closeHandler = () => {
      aborted = true;
    };
    req.on("close", closeHandler);
    await new Promise((resolve) => setTimeout(resolve, durationMsCap));
    req.off("close", closeHandler);
    const durationMs2 = Date.now() - startTime;
    addLog(endpoint.id, {
      slug: endpoint.slug,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      method: req.method,
      path: subPath,
      clientIp,
      userAgent: req.headers["user-agent"],
      behaviorApplied: "hang",
      httpStatusReturned: 0,
      durationMs: durationMs2,
      errorMessage: aborted ? `Client aborted during hang` : `Socket held open for ${durationSeconds}s then terminated`
    });
    if (res.socket && !res.socket.destroyed) {
      res.socket.destroy();
    }
    return;
  }
  const dropRule = findRule("drop");
  if (dropRule && dropRule.params.drop) {
    const { mode, bytesBeforeDrop } = dropRule.params.drop;
    const durationMs2 = Date.now() - startTime;
    if (mode === "abrupt") {
      addLog(endpoint.id, {
        slug: endpoint.slug,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        method: req.method,
        path: subPath,
        clientIp,
        userAgent: req.headers["user-agent"],
        behaviorApplied: "drop",
        httpStatusReturned: 0,
        durationMs: durationMs2,
        errorMessage: "Abrupt Socket Destruction (TCP Reset / ECONNRESET)"
      });
      if (res.socket && !res.socket.destroyed) {
        res.socket.destroy();
      }
      return;
    } else {
      const bytesLimit = bytesBeforeDrop || 64;
      setBehaviorHeaders("drop_partial");
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Length", "10000");
      const partialData = `{"status": "processing", "requestId": "${requestId}", "payload": "${"x".repeat(Math.max(10, bytesLimit - 30))}`;
      res.write(partialData);
      addLog(endpoint.id, {
        slug: endpoint.slug,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        method: req.method,
        path: subPath,
        clientIp,
        userAgent: req.headers["user-agent"],
        behaviorApplied: "drop",
        httpStatusReturned: 200,
        durationMs: durationMs2,
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
  const dripRule = findRule("drip");
  if (dripRule && dripRule.params.drip) {
    const { chunkSizeBytes, delayMsPerChunk, totalBytes } = dripRule.params.drip;
    const chunkSize = Math.max(1, Math.min(64, chunkSizeBytes || 16));
    const delay = Math.max(50, Math.min(500, delayMsPerChunk || 150));
    const maxTotal = Math.min(512, Math.max(32, totalBytes || 256));
    setBehaviorHeaders("drip");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    let bytesSent = 0;
    let clientDisconnected = false;
    const onDisconnect = () => {
      clientDisconnected = true;
    };
    req.on("close", onDisconnect);
    while (bytesSent < maxTotal && !clientDisconnected) {
      const remaining = maxTotal - bytesSent;
      const size = Math.min(chunkSize, remaining);
      const chunk = ".".repeat(size);
      res.write(chunk);
      bytesSent += size;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    req.off("close", onDisconnect);
    if (!clientDisconnected) {
      res.end(`
[Hiccups Drip Stream Complete - ${bytesSent} bytes]
`);
    }
    const durationMs2 = Date.now() - startTime;
    addLog(endpoint.id, {
      slug: endpoint.slug,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      method: req.method,
      path: subPath,
      clientIp,
      userAgent: req.headers["user-agent"],
      behaviorApplied: "drip",
      httpStatusReturned: 200,
      durationMs: durationMs2,
      details: { bytesSent, delayMsPerChunk: delay }
    });
    return;
  }
  const malformedRule = findRule("malformed");
  if (malformedRule) {
    const durationMs2 = Date.now() - startTime;
    setBehaviorHeaders("malformed");
    res.status(200);
    res.setHeader("Content-Type", "application/json");
    res.send(`{"status": "ok", "requestId": "${requestId}", "items": [{"id": 101, "name": "Broken JSON"}, {"id": 102, `);
    addLog(endpoint.id, {
      slug: endpoint.slug,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      method: req.method,
      path: subPath,
      clientIp,
      userAgent: req.headers["user-agent"],
      behaviorApplied: "malformed",
      httpStatusReturned: 200,
      durationMs: durationMs2,
      errorMessage: "Malformed JSON payload injected (Truncated syntax)"
    });
    return;
  }
  const redirectRule = findRule("redirect_loop");
  if (redirectRule) {
    const stepQuery = parseInt(req.query.step) || 1;
    const nextStep = stepQuery + 1;
    const durationMs2 = Date.now() - startTime;
    setBehaviorHeaders("redirect_loop");
    res.status(302);
    res.setHeader("Location", `/e/${slug}/loop?step=${nextStep}`);
    res.send(`Redirecting to step ${nextStep}...`);
    addLog(endpoint.id, {
      slug: endpoint.slug,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      method: req.method,
      path: subPath,
      clientIp,
      userAgent: req.headers["user-agent"],
      behaviorApplied: "redirect_loop",
      httpStatusReturned: 302,
      durationMs: durationMs2,
      details: { step: stepQuery }
    });
    return;
  }
  const errorRule = findRule("error");
  if (errorRule && errorRule.params.error) {
    const { statusCode, customBody, customHeaderKey, customHeaderValue } = errorRule.params.error;
    const status = statusCode || 503;
    const durationMs2 = Date.now() - startTime;
    setBehaviorHeaders("error");
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
    res.setHeader("Content-Type", "application/json");
    res.send(responseContent);
    addLog(endpoint.id, {
      slug: endpoint.slug,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      method: req.method,
      path: subPath,
      clientIp,
      userAgent: req.headers["user-agent"],
      behaviorApplied: "error",
      httpStatusReturned: status,
      durationMs: durationMs2,
      errorMessage: `Injected HTTP ${status}`
    });
    return;
  }
  const durationMs = Date.now() - startTime;
  setBehaviorHeaders("none_clean");
  res.status(endpoint.defaultResponseStatus || 200);
  res.setHeader("Content-Type", "application/json");
  res.send(endpoint.defaultResponseBody);
  addLog(endpoint.id, {
    slug: endpoint.slug,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    method: req.method,
    path: subPath,
    clientIp,
    userAgent: req.headers["user-agent"],
    behaviorApplied: "none_clean",
    httpStatusReturned: endpoint.defaultResponseStatus || 200,
    durationMs
  });
});
function checkCreationRateLimit(clientIp) {
  const now = Date.now();
  const entry = creationRateLimitMap.get(clientIp);
  if (!entry || entry.resetAt < now) {
    creationRateLimitMap.set(clientIp, { count: 1, resetAt: now + 6e4 });
    return true;
  }
  if (entry.count >= 30) {
    return false;
  }
  entry.count += 1;
  return true;
}
app.post("/api/v1/playground", (req, res) => {
  const clientIp = getClientIp(req);
  if (!checkCreationRateLimit(clientIp)) {
    return res.status(429).json({ success: false, error: "Rate limit exceeded. Please wait a minute before creating more endpoints." });
  }
  const sessionId = getSessionId(req);
  let customSlug = generateSlug();
  while (slugToIdMap.has(customSlug) || RESERVED_SLUGS.has(customSlug)) {
    customSlug = generateSlug();
  }
  const managementToken = `mgm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const newEndpoint = {
    id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    slug: customSlug,
    name: "24h Quick Sandbox",
    isAnonymous: true,
    ownerSessionId: sessionId || void 0,
    managementToken,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString(),
    // 24 hours TTL
    flakyPercentage: 60,
    defaultResponseStatus: 200,
    defaultResponseBody: JSON.stringify(
      { status: "success", data: "Clean response from your Hiccups sandbox endpoint." },
      null,
      2
    ),
    rules: createDefaultRules()
  };
  endpointsMap.set(newEndpoint.id, newEndpoint);
  slugToIdMap.set(customSlug, newEndpoint.id);
  logsMap.set(newEndpoint.id, []);
  persistState();
  res.status(201).json({ success: true, endpoint: newEndpoint });
});
app.post("/api/v1/endpoints", (req, res) => {
  const clientIp = getClientIp(req);
  if (!checkCreationRateLimit(clientIp)) {
    return res.status(429).json({ success: false, error: "Rate limit exceeded. Please wait a minute before creating more endpoints." });
  }
  const sessionId = getSessionId(req);
  const { name, customSlug, presetId } = req.body || {};
  let slug;
  if (customSlug && typeof customSlug === "string") {
    const normalized = customSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
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
    const preset = PRESET_PROFILES.find((p) => p.id === presetId);
    if (preset) {
      rules = JSON.parse(JSON.stringify(preset.rules));
      flakyPercentage = preset.flakyPercentage;
    }
  }
  const managementToken = `mgm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const newEndpoint = {
    id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    slug,
    name: name && typeof name === "string" && name.trim() ? name.trim().slice(0, 60) : `Chaos Endpoint ${slug}`,
    isAnonymous: false,
    ownerSessionId: sessionId || void 0,
    managementToken,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    expiresAt: null,
    // Persistent
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
  slugToIdMap.set(slug, newEndpoint.id);
  logsMap.set(newEndpoint.id, []);
  persistState();
  res.status(201).json({ success: true, endpoint: newEndpoint });
});
app.get("/api/v1/check-slug", (req, res) => {
  const rawSlug = (req.query.slug || "").toLowerCase().trim();
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
app.get("/api/v1/endpoints", (req, res) => {
  restoreState();
  const sessionId = getSessionId(req);
  const all = Array.from(endpointsMap.values());
  const filtered = all.filter((ep) => {
    if (ep.isDemo) return true;
    if (sessionId && ep.ownerSessionId === sessionId) return true;
    return !ep.ownerSessionId;
  });
  const sanitized = filtered.map((ep) => {
    if (ep.ownerSessionId && ep.ownerSessionId !== sessionId) {
      const { managementToken, ...safe } = ep;
      return safe;
    }
    return ep;
  });
  res.json({ success: true, endpoints: sanitized });
});
app.post("/api/v1/endpoints/sync", (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    return res.status(400).json({ success: false, error: "Session ID required" });
  }
  const { endpoints: syncList } = req.body || {};
  if (!Array.isArray(syncList)) {
    return res.status(400).json({ success: false, error: "endpoints must be an array" });
  }
  let restoredCount = 0;
  for (const ep of syncList) {
    if (ep && ep.id && ep.slug && ep.ownerSessionId === sessionId) {
      if (!endpointsMap.has(ep.id)) {
        endpointsMap.set(ep.id, ep);
        slugToIdMap.set(ep.slug.toLowerCase(), ep.id);
        restoredCount++;
      }
    }
  }
  if (restoredCount > 0) {
    persistState();
  }
  res.json({ success: true, restoredCount });
});
function authorizeEndpoint(req, endpoint) {
  if (endpoint.isDemo) {
    return { authorized: false, reason: "The demo endpoint is read-only. Create your own sandbox endpoint to edit rules." };
  }
  const sessionId = getSessionId(req);
  const mgmHeader = req.headers["x-management-token"] || req.headers["x-hiccup-management-token"] || "";
  const authHeader = req.headers["authorization"] || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "").trim() : "";
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
  return { authorized: true };
}
app.get("/api/v1/endpoints/:id", (req, res) => {
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
app.patch("/api/v1/endpoints/:id", (req, res) => {
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
  if (name !== void 0 && typeof name === "string") endpoint.name = name.slice(0, 60);
  if (flakyPercentage !== void 0 && typeof flakyPercentage === "number") {
    endpoint.flakyPercentage = Math.min(100, Math.max(0, flakyPercentage));
  }
  if (defaultResponseStatus !== void 0 && typeof defaultResponseStatus === "number") {
    endpoint.defaultResponseStatus = defaultResponseStatus;
  }
  if (defaultResponseBody !== void 0 && typeof defaultResponseBody === "string") {
    endpoint.defaultResponseBody = defaultResponseBody.slice(0, 16384);
  }
  if (rules !== void 0 && Array.isArray(rules)) {
    endpoint.rules = rules;
  }
  endpointsMap.set(endpoint.id, endpoint);
  persistState();
  res.json({ success: true, endpoint });
});
app.delete("/api/v1/endpoints/:id", (req, res) => {
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
  slugToIdMap.delete(endpoint.slug);
  endpointsMap.delete(endpoint.id);
  logsMap.delete(endpoint.id);
  persistState();
  res.json({ success: true, message: "Endpoint deleted successfully" });
});
app.post("/api/v1/endpoints/:id/apply-preset", (req, res) => {
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
  const preset = PRESET_PROFILES.find((p) => p.id === presetId);
  if (!preset) {
    return res.status(404).json({ success: false, error: "Preset profile not found" });
  }
  endpoint.rules = JSON.parse(JSON.stringify(preset.rules));
  endpoint.flakyPercentage = preset.flakyPercentage;
  endpointsMap.set(endpoint.id, endpoint);
  persistState();
  res.json({ success: true, endpoint, message: `Applied preset '${preset.name}'` });
});
app.get("/api/v1/endpoints/:id/logs", (req, res) => {
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
app.delete("/api/v1/endpoints/:id/logs", (req, res) => {
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
app.get("/api/v1/endpoints/:id/stats", (req, res) => {
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
  const latencies = [];
  const behaviorBreakdown = {
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
  logs.forEach((log) => {
    latencies.push(log.durationMs);
    behaviorBreakdown[log.behaviorApplied] = (behaviorBreakdown[log.behaviorApplied] || 0) + 1;
    if (log.behaviorApplied === "none_clean") {
      successRequests++;
    } else {
      faultRequests++;
    }
  });
  latencies.sort((a, b) => a - b);
  const p50 = latencies.length ? latencies[Math.floor(latencies.length * 0.5)] : 0;
  const p90 = latencies.length ? latencies[Math.floor(latencies.length * 0.9)] : 0;
  const p95 = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] : 0;
  const stats = {
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
app.use("/api/*", (req, res) => {
  res.status(404).json({ success: false, error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// server.ts
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express2.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Hiccups Chaos Engine server listening on http://0.0.0.0:${PORT}`);
    });
  }
}
startServer();
var server_default = app;
//# sourceMappingURL=server.cjs.map
