import React, { useState, useEffect } from 'react';
import { Play, Zap, Copy, Check, ChevronDown, ChevronUp, Clock, Code2, History, RotateCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ChaosEndpoint, TestExecutionResult } from '../types';
import { getEndpointOrigin, getApiUrl, getDefaultApiHeaders } from '../lib/config';

interface PlaygroundProps {
  endpoints: ChaosEndpoint[];
  activeEndpointId: string;
  onSelectEndpoint: (id: string) => void;
  onRefreshLogs?: () => void;
}

interface RequestHistoryItem {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number | string;
  durationMs: number;
  behavior: string;
}

export const Playground: React.FC<PlaygroundProps> = ({
  endpoints,
  activeEndpointId,
  onSelectEndpoint,
  onRefreshLogs
}) => {
  const activeEndpoint = endpoints.find(e => e.id === activeEndpointId) || endpoints[0];

  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'>('GET');
  const [subpath, setSubpath] = useState('');
  const [headersText, setHeadersText] = useState('{\n  "Accept": "application/json"\n}');
  const [requestBodyText, setRequestBodyText] = useState('{\n  "test": "chaos_probe"\n}');
  
  const [showHeaders, setShowHeaders] = useState(false);
  const [showBody, setShowBody] = useState(false);
  const [showResponseHeaders, setShowResponseHeaders] = useState(false);
  
  const [snippetLang, setSnippetLang] = useState<'curl' | 'javascript' | 'axios' | 'python'>('curl');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const [loading, setLoading] = useState(false);
  const [burstLoading, setBurstLoading] = useState(false);
  
  const [latestResponse, setLatestResponse] = useState<TestExecutionResult | null>(null);
  const [burstResults, setBurstResults] = useState<TestExecutionResult[]>([]);
  const [history, setHistory] = useState<RequestHistoryItem[]>([]);

  // Clear previous execution results whenever selected endpoint changes to prevent stale responses (Fixes Defect #3)
  useEffect(() => {
    setLatestResponse(null);
    setBurstResults([]);
  }, [activeEndpointId]);

  const origin = getEndpointOrigin();
  const cleanSubpath = subpath ? (subpath.startsWith('/') ? subpath : `/${subpath}`) : '';
  const fullTargetUrl = activeEndpoint?.slug ? `${origin}/e/${activeEndpoint.slug}${cleanSubpath}` : '';

  // Execute single request
  const executeSingleRequest = async () => {
    if (!fullTargetUrl) return;
    setLoading(true);
    setLatestResponse(null);
    setBurstResults([]);

    const startTime = performance.now();

    try {
      let customHeaders: Record<string, string> = {};
      if (headersText.trim()) {
        try {
          const parsed = JSON.parse(headersText);
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            customHeaders = parsed;
          } else {
            throw new Error('Custom headers must be a JSON object of key-value string pairs');
          }
        } catch (err: unknown) {
          setLoading(false);
          setLatestResponse({
            status: 'CLIENT_VALIDATION_ERROR',
            ok: false,
            durationMs: 0,
            headers: {},
            body: `[Header Syntax Error] ${(err as Error).message || 'Invalid JSON format in custom headers'}. Example: {"Authorization": "Bearer token", "X-Custom": "val"}`,
            error: 'Invalid custom headers JSON',
            behaviorDetected: 'validation_error'
          });
          return;
        }
      }

      // Attach default session headers if not overridden
      const baseApiHeaders = getDefaultApiHeaders();
      const combinedHeaders: Record<string, string> = {
        ...baseApiHeaders,
        ...customHeaders
      };

      const options: RequestInit = {
        method,
        headers: combinedHeaders
      };

      if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && requestBodyText.trim()) {
        options.body = requestBodyText;
      }

      let res = await fetch(fullTargetUrl, options);
      let behavior = res.headers.get('x-hiccup-behavior') || res.headers.get('x-faultline-behavior') || (res.ok ? 'clean_200' : 'error_response');

      // If backend instance cold-started without this endpoint, auto-sync and retry probe seamlessly
      if (res.status === 404 && behavior === 'not_found' && activeEndpoint && !activeEndpoint.isDemo) {
        try {
          const syncRes = await fetch(getApiUrl('/api/v1/endpoints/sync'), {
            method: 'POST',
            headers: getDefaultApiHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ endpoints: [activeEndpoint] })
          });
          if (syncRes.ok) {
            res = await fetch(fullTargetUrl, options);
            behavior = res.headers.get('x-hiccup-behavior') || res.headers.get('x-faultline-behavior') || (res.ok ? 'clean_200' : 'error_response');
          }
        } catch {
          // ignore resync error and show initial response
        }
      }

      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      const headerMap: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        headerMap[key] = val;
      });

      const responseText = await res.text();

      const result: TestExecutionResult = {
        status: res.status,
        ok: res.ok,
        durationMs,
        headers: headerMap,
        body: responseText,
        behaviorDetected: behavior
      };

      setLatestResponse(result);
      setHistory(prev => [
        {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          method,
          url: fullTargetUrl,
          status: res.status,
          durationMs,
          behavior
        },
        ...prev.slice(0, 19)
      ]);

      if (onRefreshLogs) {
        setTimeout(onRefreshLogs, 500);
      }
    } catch (err: unknown) {
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);
      const errMsg = err instanceof Error ? err.message : 'Unknown connection drop or fetch error';

      const droppedResult: TestExecutionResult = {
        status: 'SOCKET_DROPPED',
        ok: false,
        durationMs,
        headers: {},
        body: `[TCP Failure / Socket Reset] Connection was reset or aborted by server: ${errMsg}`,
        error: errMsg,
        behaviorDetected: 'socket_dropped_econnreset'
      };

      setLatestResponse(droppedResult);
      setHistory(prev => [
        {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          method,
          url: fullTargetUrl,
          status: 'DROPPED',
          durationMs,
          behavior: 'socket_dropped'
        },
        ...prev.slice(0, 19)
      ]);

      if (onRefreshLogs) {
        setTimeout(onRefreshLogs, 500);
      }
    } finally {
      setLoading(false);
    }
  };

  // Burst 10x requests
  const executeBurst = async () => {
    if (!fullTargetUrl) return;
    setBurstLoading(true);
    setBurstResults([]);
    setLatestResponse(null);

    const burstItems: TestExecutionResult[] = [];

    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      try {
        const res = await fetch(fullTargetUrl, { method });
        const durationMs = Math.round(performance.now() - start);
        const behavior = res.headers.get('x-hiccup-behavior') || res.headers.get('x-faultline-behavior') || 'none_clean';
        burstItems.push({
          status: res.status,
          ok: res.ok,
          durationMs,
          headers: {},
          body: '',
          behaviorDetected: behavior
        });
      } catch (err: unknown) {
        const durationMs = Math.round(performance.now() - start);
        burstItems.push({
          status: 'SOCKET_DROPPED',
          ok: false,
          durationMs,
          headers: {},
          body: '',
          behaviorDetected: 'socket_dropped'
        });
      }
      setBurstResults([...burstItems]);
      await new Promise(r => setTimeout(r, 80));
    }

    setBurstLoading(false);
    if (onRefreshLogs) {
      setTimeout(onRefreshLogs, 600);
    }
  };

  const formatBehaviorName = (behavior?: string, status?: number | string) => {
    if (!behavior) return 'Standard Response';
    if (behavior.includes('socket_dropped')) return '🔌 Socket Abruptly Destroyed';
    if (behavior.includes('hang')) return '⏳ Read Timeout (Connection Held Open)';
    if (behavior.includes('rate_limit')) return '🚧 HTTP 429 Sliding Window Exceeded';
    if (behavior.includes('drip')) return '💧 Slow Drip Stream';
    if (behavior.includes('error')) return `💥 Injected HTTP ${status} Error`;
    if (behavior.includes('latency')) return '⏱️ Injected Delay Jitter';
    return behavior;
  };

  const generateCodeSnippet = () => {
    if (snippetLang === 'curl') {
      let cmd = `curl -i -X ${method} "${fullTargetUrl}"`;
      if (headersText.trim()) {
        try {
          const h = JSON.parse(headersText);
          Object.entries(h).forEach(([k, v]) => {
            cmd += ` \\\n  -H "${k}: ${v}"`;
          });
        } catch {
          // ignore
        }
      }
      if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && requestBodyText.trim()) {
        cmd += ` \\\n  -d '${requestBodyText.replace(/\n/g, '')}'`;
      }
      return cmd;
    } else if (snippetLang === 'javascript') {
      return `// Native Fetch with resilient error inspection
fetch("${fullTargetUrl}", {
  method: "${method}",
  headers: ${headersText || '{}'}${
        method === 'POST' || method === 'PUT' || method === 'PATCH' ? `,\n  body: JSON.stringify(${requestBodyText || '{}'})` : ''
      }
})
  .then(async (res) => {
    console.log("Status:", res.status);
    console.log("Hiccup Behavior:", res.headers.get("x-hiccup-behavior"));
    if (!res.ok) {
      throw new Error(\`HTTP \${res.status}: \${await res.text()}\`);
    }
    return res.json();
  })
  .then((data) => console.log("Success:", data))
  .catch((err) => console.error("Caught fault (retry logic triggered):", err.message));`;
    } else if (snippetLang === 'axios') {
      return `// Axios with timeout and error handling
import axios from 'axios';

axios({
  method: "${method.toLowerCase()}",
  url: "${fullTargetUrl}",
  headers: ${headersText || '{}'},
  timeout: 3000${
    method === 'POST' || method === 'PUT' || method === 'PATCH' ? `,\n  data: ${requestBodyText || '{}'}` : ''
  }
})
  .then((response) => {
    console.log("Status:", response.status);
    console.log("Behavior:", response.headers["x-hiccup-behavior"]);
    console.log("Data:", response.data);
  })
  .catch((error) => {
    if (error.code === 'ECONNABORTED') {
      console.error("Timeout exceeded 3000ms!");
    } else if (error.response) {
      console.error(\`Server responded with \${error.response.status}\`);
    } else {
      console.error("Network reset / drop:", error.message);
    }
  });`;
    } else {
      return `import requests

try:
    response = requests.${method.toLowerCase()}(
        "${fullTargetUrl}",
        headers=${headersText || '{}'},
        timeout=5${method === 'POST' || method === 'PUT' ? `,\n        json=${requestBodyText || '{}'}` : ''}
    )
    print("Status:", response.status_code)
    print("Behavior Header:", response.headers.get("x-hiccup-behavior"))
    print("Body:", response.text)
except requests.exceptions.RequestException as e:
    print("Handled network fault:", e)`;
    }
  };

  const copyCodeSnippet = () => {
    navigator.clipboard.writeText(generateCodeSnippet());
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const tryFormatJson = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return text;
    }
  };

  // Burst stats summary calculation
  const cleanBurstCount = burstResults.filter(r => r.ok && r.behaviorDetected === 'none_clean').length;
  const faultBurstCount = burstResults.length - cleanBurstCount;

  return (
    <div id="playground" className="space-y-6">
      {/* Title & Endpoint Selector */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Zap className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-zinc-900">In-Browser Chaos Playground</h2>
              <p className="text-xs text-zinc-500">
                Probe endpoints live to test resilience logic, timeouts, and error handling.
              </p>
            </div>
          </div>

          {/* Endpoint Selector Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-zinc-500">Target Endpoint:</span>
            <select
              value={activeEndpointId}
              onChange={(e) => onSelectEndpoint(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 hover:border-zinc-300 text-zinc-900 text-xs font-mono font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors shadow-2xs"
            >
              {endpoints.map(ep => (
                <option key={ep.id} value={ep.id}>
                  {ep.name} (/e/{ep.slug})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Request Builder (Minimal Single Row) */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            {/* Method Dropdown */}
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="bg-zinc-900 text-amber-400 font-mono font-bold text-xs rounded-xl px-3.5 py-2.5 border border-zinc-800 focus:outline-none cursor-pointer shrink-0"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
              <option value="HEAD">HEAD</option>
            </select>

            {/* Read-only URL + Subpath */}
            <div className="flex-1 flex items-center bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500 font-mono text-xs">
              <span className="text-zinc-400 select-none shrink-0">{origin}/e/{activeEndpoint?.slug || 'slug'}</span>
              <input
                type="text"
                placeholder="/subpath (optional)"
                value={subpath}
                onChange={(e) => setSubpath(e.target.value)}
                className="bg-transparent text-zinc-900 font-semibold focus:outline-none ml-1 flex-1 placeholder:text-zinc-400"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={executeSingleRequest}
                disabled={loading || burstLoading}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center space-x-2 active:scale-95 disabled:opacity-50"
              >
                {loading ? <RotateCw className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Play className="w-3.5 h-3.5 fill-current text-amber-400" />}
                <span>Send Request</span>
              </button>

              <button
                onClick={executeBurst}
                disabled={loading || burstLoading}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center space-x-1.5 active:scale-95 disabled:opacity-50"
                title="Fire 10 requests in quick succession to verify chaos distribution"
              >
                {burstLoading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>Send Burst (10x)</span>
              </button>
            </div>
          </div>

          {/* Toggle Advanced Collapsibles */}
          <div className="flex items-center space-x-4 text-xs font-mono text-zinc-500 pt-1">
            <button
              onClick={() => setShowHeaders(prev => !prev)}
              className="hover:text-zinc-900 transition-colors flex items-center space-x-1"
            >
              {showHeaders ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>Headers {showHeaders ? '(Hide)' : '(Show)'}</span>
            </button>

            {(method === 'POST' || method === 'PUT' || method === 'PATCH') && (
              <button
                onClick={() => setShowBody(prev => !prev)}
                className="hover:text-zinc-900 transition-colors flex items-center space-x-1"
              >
                {showBody ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>Request Body {showBody ? '(Hide)' : '(Show)'}</span>
              </button>
            )}
          </div>

          {/* Headers Editor */}
          {showHeaders && (
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-500">Custom Headers (JSON)</label>
              <textarea
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
                rows={2}
                className="w-full bg-zinc-900 text-zinc-200 font-mono text-xs rounded-xl p-3 border border-zinc-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {/* Body Editor */}
          {showBody && (method === 'POST' || method === 'PUT' || method === 'PATCH') && (
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-500">Request Body (JSON)</label>
              <textarea
                value={requestBodyText}
                onChange={(e) => setRequestBodyText(e.target.value)}
                rows={3}
                className="w-full bg-zinc-900 text-zinc-200 font-mono text-xs rounded-xl p-3 border border-zinc-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Response Viewer Section */}
      {latestResponse && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-white space-y-4 shadow-lg animate-in fade-in duration-200">
          {/* Header Row with Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
            <div className="flex items-center space-x-3 font-mono text-xs">
              {/* Status Badge */}
              <span className={`px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1.5 ${
                latestResponse.ok
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : latestResponse.status === 429
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : latestResponse.status === 'SOCKET_DROPPED'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {latestResponse.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                <span>HTTP {latestResponse.status}</span>
              </span>

              {/* Latency Badge */}
              <span className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>{latestResponse.durationMs} ms</span>
              </span>
            </div>

            {/* Behavior Triggered Plain Language */}
            <div className="text-xs font-mono px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-400 font-medium">
              {formatBehaviorName(latestResponse.behaviorDetected, latestResponse.status)}
            </div>
          </div>

          {/* Response Headers Collapsible */}
          <div className="space-y-1">
            <button
              onClick={() => setShowResponseHeaders(prev => !prev)}
              className="text-xs font-mono text-zinc-400 hover:text-white flex items-center space-x-1 transition-colors"
            >
              {showResponseHeaders ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>Response Headers ({Object.keys(latestResponse.headers).length})</span>
            </button>

            {showResponseHeaders && (
              <pre className="bg-black/60 border border-zinc-800/80 rounded-xl p-3 text-[11px] font-mono text-zinc-300 max-h-40 overflow-y-auto">
                {Object.entries(latestResponse.headers).map(([k, v]) => (
                  <div key={k}><span className="text-zinc-500">{k}:</span> {v}</div>
                ))}
              </pre>
            )}
          </div>

          {/* Response Body */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-zinc-400">Response Payload</label>
            <pre className="bg-black border border-zinc-800/80 rounded-xl p-4 text-xs font-mono text-amber-300/90 overflow-x-auto max-h-60 leading-relaxed">
              {tryFormatJson(latestResponse.body)}
            </pre>
          </div>
        </div>
      )}

      {/* Burst Results Visualizer (10x Probe Strip) */}
      {burstResults.length > 0 && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-white space-y-4 shadow-lg animate-in fade-in duration-200 font-mono">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-xs">Burst Test Analysis (10 Requests)</h3>
            </div>
            <div className="text-xs text-zinc-400">
              <span className="text-emerald-400 font-bold">{cleanBurstCount} Clean</span> • <span className="text-amber-400 font-bold">{faultBurstCount} Faults</span>
            </div>
          </div>

          {/* Visual Dot Strip */}
          <div className="flex flex-wrap items-center gap-2 py-2">
            {burstResults.map((res, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[11px] border transition-all ${
                  res.ok
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : res.status === 429
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : res.status === 'SOCKET_DROPPED'
                    ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                    : 'bg-red-500/20 text-red-400 border-red-500/40'
                }`}
                title={`Req #${i + 1}: Status ${res.status} (${res.durationMs}ms) - ${res.behaviorDetected}`}
              >
                #{i + 1}
              </div>
            ))}
          </div>

          {/* Burst Breakdown Table */}
          <div className="border border-zinc-800/80 rounded-xl overflow-x-auto text-[11px]">
            <table className="w-full text-left min-w-[340px]">
              <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Latency</th>
                  <th className="px-3 py-2">Injected Behavior</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 bg-black/40">
                {burstResults.map((res, i) => (
                  <tr key={i} className="hover:bg-zinc-900/50">
                    <td className="px-3 py-1.5 text-zinc-500">#{i + 1}</td>
                    <td className="px-3 py-1.5 font-bold">
                      <span className={res.ok ? 'text-emerald-400' : 'text-red-400'}>
                        {res.status}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-zinc-400">{res.durationMs}ms</td>
                    <td className="px-3 py-1.5 text-amber-300">{formatBehaviorName(res.behaviorDetected, res.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Code Snippet & Request History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Snippet Generator */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-zinc-700" />
              <h3 className="font-bold text-xs text-zinc-900">Code Integration Snippet</h3>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center space-x-1 bg-zinc-100 p-1 rounded-lg">
              {(['curl', 'javascript', 'axios', 'python'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSnippetLang(lang)}
                  className={`px-2 py-0.5 text-[10px] rounded font-semibold transition-all ${
                    snippetLang === lang
                      ? 'bg-zinc-900 text-white shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {lang === 'curl' ? 'cURL' : lang === 'javascript' ? 'Fetch' : lang === 'axios' ? 'Axios' : 'Python'}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <pre className="bg-zinc-950 text-amber-300 p-4 rounded-xl text-xs overflow-x-auto leading-relaxed border border-zinc-800 max-h-48">
              {generateCodeSnippet()}
            </pre>

            <button
              onClick={copyCodeSnippet}
              className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] rounded-lg transition-colors flex items-center space-x-1"
            >
              {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Session Request History */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-zinc-700" />
              <h3 className="font-bold text-xs text-zinc-900">Probe Session History ({history.length})</h3>
            </div>
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                className="text-[10px] text-zinc-400 hover:text-zinc-800 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 text-xs">
              No probe requests sent yet in this session.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-2 bg-zinc-50 border border-zinc-200/80 rounded-xl flex items-center justify-between text-[11px] hover:border-zinc-300 transition-colors"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="font-bold text-zinc-800">{item.method}</span>
                    <span className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                      item.status === 200 || item.status === '200'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.status}
                    </span>
                    <span className="text-zinc-500 truncate text-[10px]">{item.behavior}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 shrink-0">{item.durationMs}ms</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
