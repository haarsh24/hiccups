# ⚡ Hiccup — Network Chaos & Reliability Testing Sandbox

<p align="center">
  <img src="https://img.shields.io/badge/Hiccup-Network%20Chaos%20Engine-amber?style=for-the-badge&logo=fastapi&logoColor=white" alt="Hiccup Engine" />
  <img src="https://img.shields.io/badge/Status-Production%20Ready-emerald?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <strong>Instant, zero-configuration hosted HTTP endpoints designed to break on purpose.</strong><br/>
  Test retry strategies, circuit breakers, rate limits, socket hangs, and error boundaries in seconds.
</p>

<p align="center">
  <a href="#-why-hiccup">Why Hiccup</a> •
  <a href="#-example-problems-it-solves">Problems It Solves</a> •
  <a href="#-fault-injection-capabilities">Fault Injections</a> •
  <a href="#-presets">Scenarios</a> •
  <a href="#-code-examples">Code Examples</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-self-hosting--local-setup">Self-Hosting</a>
</p>

---

> *"If your system crashes in production, it's a disaster. If it breaks in Hiccup, it's just a test."*

---

## 🎯 Why Hiccup?

Modern client apps, mobile SDKs, and backend microservices are almost always developed against pristine local environments (`localhost:8080`) where:
- Latency is `0ms`.
- Packets are never dropped.
- Sockets never abruptly disconnect.
- HTTP status codes are always `200 OK`.
- Responses are always well-formed JSON.

### The Reality of Production
In production, the network is fundamentally hostile:
- **Payment gateways hang** for 15 seconds without returning a response, locking server worker threads or leaving customer UIs frozen.
- **Mobile Wi-Fi to cellular handoffs** drop TCP connections mid-transmission (`ECONNRESET`).
- **Third-party APIs throw `HTTP 429`** with `Retry-After` headers that naive clients ignore, triggering accidental denial-of-service retry storms.
- **Edge proxies and reverse proxies panic**, returning truncated HTML error pages with `Content-Type: application/json` that crash client deserialization routines.
- **Upstream microservices experience cascading latency**, turning a 50ms user action into a 6-second timeout disaster.

**Hiccup solves this by providing live, configurable HTTP endpoints that misbehave predictably.** You point your API client, cURL script, or frontend fetch call at your Hiccup endpoint, configure the exact network failure conditions you want, and watch how your application responds.

---

## 💥 Example Problems It Solves

Here are concrete, real-world engineering failures you can reproduce and bulletproof using Hiccup:

### 1. The Hanging Payment Gateway (Silent Socket Hang)
* **The Bug:** Your backend calls a credit card processing API. The payment provider suffers an internal network partition. The TCP socket stays open, but zero bytes are returned. Because your client code omitted a read timeout (`timeout: 0` default in many libraries), the thread hangs indefinitely. Eventually, all worker threads exhaustion occurs and the entire service goes down.
* **How Hiccup Fixes It:** Enable **Silent Socket Hang** or set **Latency to 15,000ms**. Verify that your client's `AbortSignal.timeout(5000)`, Axios `timeout: 5000`, or Go `http.Client{Timeout: 5s}` properly trips, cancels the in-flight request, and releases resources.

### 2. The Accidental DDOS Retry Storm (Rate Limiting & 429s)
* **The Bug:** An upstream partner imposes a rate limit of 10 requests per minute. When limit is breached, it responds with `429 Too Many Requests` and a `Retry-After: 5` header. A naive retry loop immediately hammers the endpoint 5 times in a row without backoff, permanently getting your IP blacklisted.
* **How Hiccup Fixes It:** Enable **Rate Limiting** with a max rate of 5 req/min. Fire a burst of requests to verify your exponential backoff algorithm with full jitter accurately parses `Retry-After` and delays subsequent dispatches.

### 3. The Sudden Wi-Fi Drop (`ECONNRESET` / Abrupt Socket Termination)
* **The Bug:** A user enters an elevator or tunnel. The TCP connection is violently severed mid-payload. Many HTTP libraries throw unhandled transport-layer exceptions (`TypeError: fetch failed`, `ECONNRESET`) rather than standard HTTP errors. If not caught, this crashes the background sync process or unmounts the UI.
* **How Hiccup Fixes It:** Enable **TCP Reset / Socket Drop**. The Hiccup server immediately destroys the TCP socket using `socket.destroy()`. Test whether your transport-level retry handler re-establishes the connection cleanly.

### 4. The White Screen of Death (Corrupted JSON & Truncated Payloads)
* **The Bug:** An upstream reverse proxy panics or runs out of memory, sending an incomplete payload like `{"status": "ok", "items": [` before aborting. In your frontend, calling `await response.json()` throws `SyntaxError: Unexpected end of JSON input`. Without an Error Boundary or safe parsing wrapper, the entire UI crashes.
* **How Hiccup Fixes It:** Enable **Malformed JSON Syntax**. Hiccup returns `HTTP 200` with malformed or truncated payloads. Test that your app catches parsing errors, logs telemetry, and renders a graceful error card.

### 5. Cascading Microservice Failure (Circuit Breaker Validation)
* **The Bug:** Service A depends on Service B. Service B slows down from 50ms to 3,500ms. Service A's connection pool fills up waiting for Service B, causing Service A to fail, which in turn causes the frontend gateway to fail.
* **How Hiccup Fixes It:** Set a 40% **Flaky Chaos Rate** with high latency and `503 Service Unavailable` errors. Verify that your Circuit Breaker (Resilience4j, Opossum, Polly, or Cockatiel) transitions from `CLOSED` to `OPEN`, immediately falls back to cached data, and later transitions to `HALF-OPEN` to test recovery.

### 6. Slow Drip Streaming Starvation
* **The Bug:** An API returns chunked responses, but streams only 2 bytes every 400 milliseconds. Does your streaming parser buffer memory indefinitely, or does it enforce a minimum transfer rate timeout?
* **How Hiccup Fixes It:** Enable **Slow Drip Streaming**. Hiccup streams data byte-by-byte using `Transfer-Encoding: chunked` with configurable inter-byte delays.

---

## ✨ Features

### ⚡ Instant Sandbox Creation
- **1-Click Quick Sandbox (`+ Quick Endpoint`)**: Zero signups, zero API keys, zero configuration forms. Get a live 24-hour sandbox endpoint with a single click.
- **Custom Named Slugs (`+ Custom Slug`)**: Reserve persistent custom slugs (e.g. `/e/stripe-sandbox-v1`) with a secret **Management Token** to update rules or delete endpoints anytime.

### 🧪 Interactive In-Browser Playground
- **Full HTTP Method Suite**: Supports `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`.
- **Subpath Routing**: Append any subpath (e.g., `/e/my-endpoint/v1/users/42`) and query strings; rules apply globally.
- **Header & Body Configuration**: Send custom headers and JSON payloads directly from your browser.
- **10x Burst Test Mode**: Send 10 rapid concurrent probes in one click to verify statistical probability distributions (e.g., 50% errors, 70% latency).
- **Probe Session History**: Inspect the last 10 requests, including exact latency in milliseconds, status codes, and injected behavior flags.
- **Multi-Language Code Generator**: Instant, copy-pasteable snippets for `cURL`, `JavaScript fetch()`, `Axios`, and `Python requests`.

### 📊 Real-Time Telemetry & Percentile Analytics
- Live request counts and effective chaos trigger rates.
- Latency percentiles calculated live: **P50, P90, P95**.
- Detailed request inspection with timestamped execution logs.

### 🌐 Universal CORS & Zero Restrictions
- Full CORS support out of the box (`Access-Control-Allow-Origin: *`, credentials, preflight handling).
- Call Hiccup endpoints directly from web browsers, mobile apps, Postman, Insomnia, CLI tools, or CI/CD automated test pipelines.

---

## 🎛️ Fault Injection Capabilities

Hiccup provides 8 modulatable network behaviors that can be enabled individually or combined:

| Behavior | Injected Phenomenon | Typical Production Scenario |
| :--- | :--- | :--- |
| **Latency & Jitter** | Artificial delay (e.g. 500ms – 5,000ms) with Gaussian jitter | Cross-region network lag, cold starts, slow database queries |
| **HTTP Error Codes** | Returns `500`, `502`, `503`, or `504` with customizable error messages | Backend panic, bad gateway, service unavailable, gateway timeout |
| **TCP Socket Drop** | Abruptly destroys the raw socket (`socket.destroy()`) | Mobile cellular drop, connection reset by peer (`ECONNRESET`) |
| **Silent Socket Hang** | Holds connection open indefinitely without sending bytes | Network blackhole, deadlocked server process, infinite read wait |
| **Rate Limiter (429)** | Rejects requests exceeding threshold with `Retry-After` header | Tiered API limits, noisy neighbor throttling |
| **Malformed JSON** | Sends `HTTP 200` with truncated or corrupted syntax | Truncated responses, proxy panics, bad serialization |
| **Slow Drip Streaming** | Emits response byte-by-byte with delays between chunks | Low-bandwidth mobile networks, satellite connections |
| **Redirect Loop** | Emits `302 Found` pointing back to itself | Misconfigured reverse proxy routing, infinite auth redirects |

---

## 📋 Real-World Presets

Load pre-configured chaos profiles with a single click:

| Preset Profile | Injected Conditions | Best For Testing |
| :--- | :--- | :--- |
| **💳 Flaky Payment Gateway** | 80% chance of 8-15s latency, 30% HTTP 504 | Checkout timeout boundaries, idempotency keys, duplicate payment prevention |
| **⚡ Overloaded Microservice** | 50% chance of HTTP 500/503 | Circuit breakers, retry policies, fallback caches |
| **🚧 Rate Limit Throttling** | Enforces 5 req/min, 90% chance of HTTP 429 with `Retry-After: 3` | Exponential backoff, retry headers parsing |
| **📱 Unstable Mobile 3G** | Latency jitter (1-4s), 25% TCP drop, 20% slow drip | Mobile offline sync, background upload retries |
| **⚠️ Corrupted Data Pipeline** | 60% chance of malformed JSON syntax | UI Error Boundaries, safe JSON parsing, input validation |

---

## 💻 Code Examples

### 1. Resilient JavaScript / TypeScript Client
Demonstrating retry logic with exponential backoff, jitter, and `Retry-After` handling:

```typescript
interface RequestOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  timeoutMs?: number;
}

async function resilientFetch<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { maxRetries = 3, initialDelayMs = 500, timeoutMs = 4000 } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      // Handle Rate Limiting (429)
      if (response.status === 429) {
        const retryHeader = response.headers.get('Retry-After');
        const delaySeconds = retryHeader ? parseInt(retryHeader, 10) : 2;
        console.warn(`[429 Rate Limited] Waiting ${delaySeconds}s before retry...`);
        await new Promise(res => setTimeout(res, delaySeconds * 1000));
        continue;
      }

      // Handle Server Errors (5xx)
      if (response.status >= 500) {
        throw new Error(`Server error: HTTP ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(`Request failed: HTTP ${response.status}`);
      }

      // Safely parse JSON to guard against malformed payloads
      const text = await response.text();
      try {
        return JSON.parse(text) as T;
      } catch (err) {
        throw new Error(`Corrupted JSON payload received: ${err}`);
      }

    } catch (error: any) {
      clearTimeout(timer);
      const isTimeout = error.name === 'AbortError';
      const isLastAttempt = attempt === maxRetries;

      console.warn(`[Attempt ${attempt}/${maxRetries} Failed] ${isTimeout ? 'Request timed out' : error.message}`);

      if (isLastAttempt) {
        throw new Error(`All ${maxRetries} retry attempts failed. Last error: ${error.message}`);
      }

      // Exponential backoff with full jitter
      const backoff = initialDelayMs * Math.pow(2, attempt - 1);
      const jitteredDelay = Math.random() * backoff;
      await new Promise(res => setTimeout(res, jitteredDelay));
    }
  }

  throw new Error('Unexpected retry loop termination');
}

// Example usage against your Hiccup endpoint:
resilientFetch('https://hiccups.kumarharsh.in/e/my-endpoint')
  .then(data => console.log('Successfully recovered data:', data))
  .catch(err => console.error('Final fallback error:', err.message));
```

---

### 2. Python Client with Timeout & Connection Error Resilience

```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry

def create_resilient_session(retries=3, backoff_factor=0.5):
    session = requests.Session()
    retry_strategy = Retry(
        total=retries,
        backoff_factor=backoff_factor,
        status_forcelist=[429, 500, 502, 503, 504],
        raise_on_status=False
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session

def fetch_data_from_hiccup(slug: str):
    url = f"https://hiccups.kumarharsh.in/e/{slug}"
    session = create_resilient_session()

    try:
        # Strict 3-second read timeout to catch silent socket hangs
        response = session.get(url, timeout=3.0)
        
        if response.status_code == 429:
            retry_after = response.headers.get("Retry-After", 2)
            print(f"Rate limited. Upstream advises waiting {retry_after}s.")
            return None

        response.raise_for_status()
        return response.json()

    except requests.exceptions.Timeout:
        print("⏰ Timeout: Hiccup held the connection open past our 3s threshold.")
    except requests.exceptions.ConnectionError:
        print("🔌 Connection Reset: Hiccup severed the TCP socket.")
    except requests.exceptions.JSONDecodeError:
        print("🧩 Malformed JSON: Hiccup returned invalid payload syntax.")
    except requests.exceptions.HTTPError as e:
        print(f"💥 HTTP Error: {e}")
```

---

### 3. Quick cURL Burst Test
Test your endpoint with a 5-request burst directly from your terminal:

```bash
for i in {1..5}; do
  echo "--- Request #$i ---"
  curl -s -w "\nHTTP Status: %{http_code} | Time: %{time_total}s\n" \
       https://hiccups.kumarharsh.in/e/demo-chaos
done
```

---

## 🔌 API Reference

### Chaos Execution Endpoints

| Method | Route | Description |
| :--- | :--- | :--- |
| `ANY` | `/e/:slug` | Trigger chaos pipeline on the specified endpoint. Accepts any subpath (e.g. `/e/:slug/api/v2/items`) and query parameters. |

#### Injected Response Headers
Every response from a Hiccup endpoint includes informative diagnostics:
- `X-Hiccup-Behavior`: Injected behavior tag (e.g., `latency_delay`, `error_status`, `socket_reset`, `none_clean`).
- `X-Hiccup-Request-Id`: Unique request identifier.
- `X-Hiccup-Endpoint`: Endpoint slug.

---

### Control Plane REST API

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/playground` | Create an instant 24-hour sandbox endpoint with zero payload required. |
| `POST` | `/api/v1/endpoints` | Create a persistent custom endpoint. Body: `{ name: string, customSlug?: string }`. |
| `GET` | `/api/v1/endpoints` | List all active endpoints created in the caller's session. |
| `GET` | `/api/v1/endpoints/:id` | Fetch configuration and rules for a specific endpoint. |
| `PATCH` | `/api/v1/endpoints/:id` | Update endpoint settings (name, flaky percentage, rules). |
| `PATCH` | `/api/v1/endpoints/:id/rules/:ruleId` | Update a single chaos rule (e.g., latency bounds, error codes). |
| `DELETE` | `/api/v1/endpoints/:id` | Delete an endpoint (requires owner session or `X-Management-Token`). |
| `POST` | `/api/v1/endpoints/sync` | Sync and restore client-cached endpoints across container cold starts. |
| `GET` | `/api/v1/check-slug?slug=:slug` | Verify whether a slug is available for creation. |
| `GET` | `/api/v1/endpoints/:id/stats` | Retrieve telemetry, request volume, and latency percentiles. |
| `GET` | `/health` | Engine health check, uptime, active endpoints count, and telemetry stats. |
| `GET` | `/manus-routes.json` | Complete machine-readable route manifest. |

---

## 🛠️ Self-Hosting & Local Setup

Hiccup is completely self-contained. It requires **no external database** (PostgreSQL, Redis, MongoDB, etc.) to run. Endpoints are managed with high-performance in-memory state stores paired with atomic file-based persistence that survives server restarts.

### Prerequisites
- Node.js `18.0.0` or higher
- npm or yarn

### 1. Clone & Install
```bash
git clone https://github.com/your-username/hiccup.git
cd hiccup
npm install
```

### 2. Run in Development Mode
```bash
npm run dev
```
The server will start at `http://localhost:3000` with hot-reloading for the frontend and instant backend routing.

### 3. Run Smoke Tests
```bash
npm test
```
Executes the comprehensive automated smoke test suite verifying all 17 endpoint routes, socket manipulation, CORS compliance, and fault injection logic.

### 4. Build for Production
```bash
npm run build
npm start
```

### Environment Variables
Configure options via `.env` or system environment variables:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port for the HTTP server to listen on. |
| `DATA_DIR` | `./.data` or system `/tmp` | Directory for the atomic JSON endpoint persistence file. |
| `APP_URL` | Self-determined | Public URL of the deployment (used for links and code snippets). |
| `VITE_API_BASE_URL` | Empty (same origin) | Backend URL if frontend is hosted on a separate static host. |

---

## 🏗️ Architecture

```
                  ┌────────────────────────────────────────┐
                  │          Incoming HTTP Request         │
                  │        (Browser / cURL / Client)       │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │      Global CORS &        │
                        │   Security Headers (HSTS) │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │    Slug Index Resolver    │
                        │   (In-Memory + Multi-Disk)│
                        └─────────────┬─────────────┘
                                      │
                       Is Chaos Rolled? (Flaky %)
                                ╱         ╲
                             Yes           No
                             ╱               ╲
                            ▼                 ▼
          ┌──────────────────────────┐   ┌──────────────────────────┐
          │   Fault Injection Engine │   │   Clean Default Response │
          │  ──────────────────────  │   │   HTTP 200 OK            │
          │  • Latency & Jitter      │   │   {"status": "ok"}       │
          │  • HTTP Errors (5xx/4xx) │   └──────────────────────────┘
          │  • Socket Drops (Reset)  │
          │  • Silent Socket Hang    │
          │  • Rate Limiting (429)   │
          │  • Malformed Payloads    │
          │  • Slow Drip Streaming   │
          └─────────────┬────────────┘
                        │
                        ▼
          ┌──────────────────────────┐
          │  Real-Time Telemetry Log │
          │  & Latency Percentiles   │
          └──────────────────────────┘
```

---

## 📄 License

MIT License. Free for personal, commercial, and open-source testing.

---

<p align="center">
  Made with ❤️ by <a href="https://kumarharsh.in">Harsh</a>
</p>
