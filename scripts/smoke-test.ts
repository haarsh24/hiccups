// Automated Smoke Tests for Hiccups Chaos Engineering Engine
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function runTests() {
  console.log(`\n🧪 Starting Hiccups Smoke Test Suite against ${BASE_URL}...\n`);
  let passed = 0;
  let failed = 0;

  const testSessionId = `test_session_${Date.now()}`;
  const testHeaders: Record<string, string> = {
    'Accept': 'application/json',
    'X-Hiccup-Session-Id': testSessionId
  };

  async function assert(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: unknown) {
      console.error(`  ❌ FAIL: ${name} -> ${(err as Error).message}`);
      failed++;
    }
  }

  // 1. Health check
  await assert('GET /health returns 200 with service info', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error(`Expected status ok, got ${data.status}`);
  });

  // 2. Robots.txt
  await assert('GET /robots.txt policy allows root and disallows /e/ and /api/', async () => {
    const res = await fetch(`${BASE_URL}/robots.txt`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const text = await res.text();
    if (!text.includes('Disallow: /e/') || !text.includes('Disallow: /api/')) {
      throw new Error(`Invalid robots.txt content: ${text}`);
    }
  });

  // 3. manus-routes.json
  await assert('GET /manus-routes.json returns structured route manifest', async () => {
    const res = await fetch(`${BASE_URL}/manus-routes.json`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.routes) || data.routes.length < 3) {
      throw new Error(`Expected routes array with >=3 routes`);
    }
  });

  // 4. Seeded Demo Chaos Endpoint
  await assert('GET /e/demo-chaos serves requests with X-Hiccup-Behavior & X-Hiccup-Request-Id', async () => {
    const res = await fetch(`${BASE_URL}/e/demo-chaos`);
    const behavior = res.headers.get('x-hiccup-behavior');
    const requestId = res.headers.get('x-hiccup-request-id');
    if (!behavior) throw new Error('Missing canonical X-Hiccup-Behavior header');
    if (!requestId) throw new Error('Missing X-Hiccup-Request-Id header');
  });

  // 5. CORS preflight OPTIONS
  await assert('OPTIONS /e/demo-chaos returns 204 with CORS headers', async () => {
    const res = await fetch(`${BASE_URL}/e/demo-chaos`, { method: 'OPTIONS' });
    if (res.status !== 204) throw new Error(`Expected 204, got ${res.status}`);
    const allowHeaders = res.headers.get('access-control-allow-headers');
    const exposeHeaders = res.headers.get('access-control-expose-headers');
    if (!exposeHeaders || !exposeHeaders.includes('x-hiccup-behavior')) {
      throw new Error(`Missing exposed header in CORS: ${exposeHeaders}`);
    }
  });

  // 6. Check slug
  await assert('GET /api/v1/check-slug correctly identifies taken demo-chaos slug', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/check-slug?slug=demo-chaos`);
    const data = await res.json();
    if (data.taken !== true) throw new Error(`Expected taken=true for demo-chaos`);
  });

  await assert('GET /api/v1/check-slug identifies reserved slug', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/check-slug?slug=health`);
    const data = await res.json();
    if (data.available !== false) throw new Error(`Expected available=false for reserved slug 'health'`);
  });

  // 7. Create 24h Quick Sandbox Endpoint
  let createdQuickId = '';
  let createdQuickSlug = '';
  await assert('POST /api/v1/playground creates 24h sandbox endpoint', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/playground`, {
      method: 'POST',
      headers: testHeaders
    });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Expected 201/200, got ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.endpoint || !data.endpoint.slug) {
      throw new Error(`Invalid response payload`);
    }
    createdQuickId = data.endpoint.id;
    createdQuickSlug = data.endpoint.slug;
    if (!data.endpoint.expiresAt) throw new Error('Quick sandbox must have expiresAt TTL');
  });

  // 8. Create Custom Named Endpoint
  let customEndpointId = '';
  const testCustomSlug = `test-resilience-${Date.now().toString(36)}`;
  await assert('POST /api/v1/endpoints creates custom named endpoint', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/endpoints`, {
      method: 'POST',
      headers: { ...testHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Automated Test API',
        customSlug: testCustomSlug,
        presetId: 'flaky-payment-gateway'
      })
    });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Expected 201/200, got ${res.status}`);
    const data = await res.json();
    if (!data.success || data.endpoint.slug !== testCustomSlug) {
      throw new Error(`Failed to create custom slug: ${JSON.stringify(data)}`);
    }
    customEndpointId = data.endpoint.id;
  });

  // 9. Scoped endpoints listing
  await assert('GET /api/v1/endpoints returns endpoints for authorized session and demo', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/endpoints`, { headers: testHeaders });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.endpoints)) throw new Error('Invalid endpoints array');
    const hasDemo = data.endpoints.some((e: any) => e.slug === 'demo-chaos');
    const hasCustom = data.endpoints.some((e: any) => e.id === customEndpointId);
    if (!hasDemo) throw new Error('Missing demo endpoint in list');
    if (!hasCustom) throw new Error('Missing custom endpoint in list');
  });

  // 10. Call the custom chaos endpoint
  await assert('GET /e/{slug} executes fault injection and logs request', async () => {
    const res = await fetch(`${BASE_URL}/e/${testCustomSlug}`);
    const behavior = res.headers.get('x-hiccup-behavior');
    if (!behavior) throw new Error('Missing x-hiccup-behavior header');
  });

  // 11. Verify logs and stats
  await assert('GET /api/v1/endpoints/{id}/logs and /stats records telemetry', async () => {
    const [logsRes, statsRes] = await Promise.all([
      fetch(`${BASE_URL}/api/v1/endpoints/${customEndpointId}/logs`, { headers: testHeaders }),
      fetch(`${BASE_URL}/api/v1/endpoints/${customEndpointId}/stats`, { headers: testHeaders })
    ]);
    const logsData = await logsRes.json();
    const statsData = await statsRes.json();
    if (!logsData.success || !Array.isArray(logsData.logs) || logsData.logs.length === 0) {
      throw new Error('Logs were not recorded');
    }
    if (!statsData.success || statsData.stats.totalRequests < 1) {
      throw new Error('Stats counter was not incremented');
    }
  });

  // 12. Protection of demo endpoint against deletion
  await assert('DELETE /api/v1/endpoints/ep-demo-chaos is forbidden (protected)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/endpoints/ep-demo-chaos`, {
      method: 'DELETE',
      headers: testHeaders
    });
    if (res.status !== 403) throw new Error(`Expected 403 Forbidden for demo deletion, got ${res.status}`);
  });

  // 13. Clean deletion of user-owned custom endpoint
  await assert('DELETE /api/v1/endpoints/{id} successfully deletes authorized endpoint', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/endpoints/${customEndpointId}`, {
      method: 'DELETE',
      headers: testHeaders
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const checkRes = await fetch(`${BASE_URL}/e/${testCustomSlug}`);
    if (checkRes.status !== 404) throw new Error(`Expected 404 after deletion, got ${checkRes.status}`);
  });

  // Summary
  console.log(`\n========================================`);
  console.log(`🏁 Smoke Tests Complete: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Smoke test suite failed with unhandled error:', err);
  process.exit(1);
});
