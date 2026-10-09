# ⚡ Hiccup — Network Chaos & Reliability Testing Sandbox

> **"If your app breaks in production, it's a disaster. If it breaks in Hiccup, it's just a test."**

**Hiccup** is an instant, configurable network chaos sandbox designed to test how your frontend, mobile apps, SDKs, and microservices handle real-world network failures, latency spikes, rate limits, and flaky APIs.

---

## 🚀 Why Hiccup?

Modern microservices and client apps often assume the network is reliable. But in the real world:
- Wi-Fi drops mid-request
- Payment gateways hang for 15 seconds before timing out
- Rate limiters throw `HTTP 429` with `Retry-After` headers
- Proxies truncate JSON payloads or drop TCP sockets abruptly (`ECONNRESET`)

Testing these edge cases in code is painful. **Hiccup gives you live HTTP mock endpoints that fail on purpose**, letting you test your retry logic, circuit breakers, backoff strategies, and fallback UI live in seconds.

---

## ✨ Key Features

### 1. ⚡ 1-Click Instant Quick Endpoints
- **Zero form fields, zero waiting**: Click **`+ Quick Endpoint`** to immediately get a live 24-hour sandbox endpoint with a random slug (`/e/quick-xxxx`).
- **Custom Slugs & Persistence**: Want a named endpoint like `/e/payments-v1`? Click **`+ Custom Slug`** to choose your own slug and receive a secret **Management Token** to edit or manage it anytime.

### 2. 🧪 Interactive In-Browser Playground
Test your endpoint's behavior directly in your browser without touching terminal or cURL:
- **Single Request Probes**: Choose `GET`, `POST`, `PUT`, or `DELETE`, configure custom headers, and send live HTTP requests.
- **10x Burst Test Mode**: Fire 10 rapid-fire requests in quick succession to visually verify probability distributions (e.g. 70% latency, 40% error rate).
- **Deep Response Inspection**: View status code badges, exact roundtrip duration in milliseconds, injected behavior tags, headers, and formatted JSON payloads.
- **Probe Session History**: Auto-tracks your last 10 test requests.
- **Instant Code Generator**: Auto-generates ready-to-copy code in `cURL`, `JavaScript fetch()`, or `Python requests`.

### 3. 🎯 8 Modulatable Fault Behaviors
Fine-tune probabilities (0% to 100%) for each individual fault behavior:
1. **⏱️ Latency & Jitter**: Inject artificial delay (e.g., 500ms – 4000ms) with optional Gaussian jitter.
2. **💥 HTTP Error Codes**: Force HTTP `500 Internal Error`, `502 Bad Gateway`, `503 Service Unavailable`, or `504 Gateway Timeout`.
3. **🔌 TCP Reset / Socket Drop**: Abruptly close TCP sockets (`ECONNRESET`) or drop connections mid-stream.
4. **⏳ Silent Socket Hang**: Hold connection open silently until client HTTP read timeout trips.
5. **🚧 Rate Limiting (HTTP 429)**: Enforce max requests per minute and return `Retry-After` headers.
6. **💧 Slow Drip Byte Streaming**: Stream tiny byte chunks slowly over time to stress chunked parser timeouts.
7. **🧩 Malformed JSON Syntax**: Return `HTTP 200` with truncated, corrupted JSON syntax to test deserialization error boundaries.
8. **🔄 Redirect Loops**: Inject `HTTP 302` redirect loops.

### 4. 🎛️ Instant Chaos Presets
Load pre-configured real-world scenario profiles in one click:
- **Payment Gateway Timeout**: 80% chance of 8-15s latency, 30% HTTP 504
- **Flaky Microservice**: 50% chance of HTTP 500/503 errors
- **Rate Limit Breach**: Enforces 5 req/min, 90% chance of HTTP 429
- **Unstable Mobile 3G Connection**: Latency, abrupt drops, and slow drip streams
- **Corrupted API Payload**: 60% chance of invalid JSON syntax

### 5. 📊 Real-Time Telemetry & Latency Percentiles
Track live traffic captured by your chaos endpoints:
- Total probe requests captured
- Effective chaos rate & fault counts
- Latency distribution percentiles (**P50, P90, P95**)
- Raw telemetry log inspector with detailed request metadata

---

## 🛠️ Quick Start Guide

### 1. Send a Test Request with cURL
```bash
# Replace 'your-slug' with your actual Hiccup slug
curl -X GET "https://your-hiccup-host/e/your-slug"
```

### 2. Integrate in JavaScript / TypeScript
```javascript
async function fetchUserWithRetry(slug, maxRetries = 3) {
  const url = `https://your-hiccup-host/e/${slug}`;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 2;
        console.warn(`Rate limited. Retrying after ${retryAfter}s...`);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP Fault ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      console.error(`Attempt ${attempt} failed:`, err.message);
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
    }
  }
}
```

### 3. Integrate in Python
```python
import requests
import time

def call_hiccup_endpoint(slug):
    url = f"https://your-hiccup-host/e/{slug}"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.Timeout:
        print("⏰ Timeout detected! Hiccup hanging behavior triggered.")
    except requests.exceptions.ConnectionError:
        print("🔌 Socket dropped! Connection reset by Hiccup.")
    except requests.exceptions.HTTPError as e:
        print(f"💥 HTTP Error: {e}")
```

---

## ⚙️ Tech Stack & Architecture

- **Frontend**: React 18, TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend Server**: Node.js + Express + Vite Middleware (`server.ts`)
- **Build Tooling**: `tsx` in dev mode, `esbuild` bundled CommonJS for production deployment
- **Zero Heavy Dependencies**: Native HTTP stream control for TCP drops, slow drip streams, and socket manipulation.

---

## 🔑 Management Tokens & Persistence

- **Quick 24h Endpoints**: Intended for quick scratchpad tests. Auto-expire after 24 hours.
- **Custom Slug Endpoints**: Persistent! When created, a unique `managementToken` (e.g., `mgm_1720000_abc123`) is generated. Keep this token safe to edit rules or delete the endpoint in the future.

---

<p center>
  Built with ❤️ for resilient developers. Stop guessing how your app handles network failure — test it with <strong>Hiccup</strong>!
</p>
