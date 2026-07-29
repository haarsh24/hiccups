import React, { useState } from 'react';
import { RotateCcw, AlertTriangle, Clock, Send, Play } from 'lucide-react';
import { ChaosEndpoint, TestExecutionResult } from '../types';

interface LiveTesterProps {
  endpoint: ChaosEndpoint;
  onRefreshLogs: () => void;
}

export const LiveTester: React.FC<LiveTesterProps> = ({ endpoint, onRefreshLogs }) => {
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [clientTimeoutSec, setClientTimeoutSec] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestExecutionResult | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = endpoint?.slug ? `${origin}/e/${endpoint.slug}` : '';

  const executeTest = async () => {
    setLoading(true);
    setResult(null);

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), clientTimeoutSec * 1000);

    try {
      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Hiccup-Test-Client': '1'
        },
        body: method !== 'GET' ? JSON.stringify({ testPayload: true, timestamp: Date.now() }) : undefined
      });

      const durationMs = Date.now() - startTime;
      clearTimeout(timeoutId);

      const headerObj: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        headerObj[key] = val;
      });

      const textBody = await response.text();

      setResult({
        status: `${response.status} ${response.statusText}`,
        ok: response.ok,
        durationMs,
        headers: headerObj,
        body: textBody,
        behaviorDetected: response.headers.get('x-hiccup-behavior') || response.headers.get('x-faultline-behavior') || undefined
      });
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      clearTimeout(timeoutId);

      const isAbort = (err as Error)?.name === 'AbortError';
      const errorMsg = isAbort
        ? `Client AbortError: Request timed out after ${clientTimeoutSec} seconds.`
        : `Network Error: Socket dropped, connection reset, or CORS blockage (${(err as Error)?.message || 'Failed to fetch'})`;

      setResult({
        status: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
        ok: false,
        durationMs,
        headers: {},
        body: '',
        error: errorMsg
      });
    } finally {
      setLoading(false);
      setTimeout(onRefreshLogs, 300);
    }
  };

  return (
    <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 space-y-4 font-mono shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80">
        <div className="flex items-center space-x-2">
          <Play className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold text-zinc-900 font-sans">Live Request Workbench</h3>
        </div>
        <span className="text-[11px] text-zinc-500 font-mono">
          Client-side HTTP probe
        </span>
      </div>

      {/* Control Row */}
      <div className="flex items-center space-x-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE')}
          className="bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 font-bold cursor-pointer"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>

        <div className="flex items-center space-x-1.5 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-600">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Timeout:</span>
          <input
            type="number"
            min="1"
            max="60"
            value={clientTimeoutSec}
            onChange={(e) => setClientTimeoutSec(parseInt(e.target.value) || 5)}
            className="w-8 bg-transparent text-zinc-900 font-mono text-xs focus:outline-none text-center font-bold"
          />
          <span className="text-[10px]">s</span>
        </div>

        <button
          onClick={executeTest}
          disabled={loading}
          className="flex-1 py-1.5 px-4 rounded-lg text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 shadow-2xs"
        >
          {loading ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5 text-amber-400" />
              <span>Send Probe</span>
            </>
          )}
        </button>
      </div>

      {/* Output Panel */}
      {result && (
        <div className="bg-zinc-950 border border-zinc-800/90 rounded-xl p-3.5 space-y-2 text-xs text-zinc-200">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                result.ok
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                {result.status}
              </span>
              <span className="text-zinc-400 flex items-center space-x-1 text-[11px]">
                <Clock className="w-3 h-3 text-zinc-500" />
                <span>{result.durationMs}ms</span>
              </span>
            </div>

            {result.behaviorDetected && (
              <span className="px-2 py-0.5 rounded bg-zinc-900 text-amber-300 border border-zinc-800 text-[10px]">
                behavior: {result.behaviorDetected}
              </span>
            )}
          </div>

          {result.error ? (
            <div className="text-red-400 text-[11px] flex items-start space-x-2 pt-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{result.error}</span>
            </div>
          ) : (
            <pre className="bg-black border border-zinc-900 rounded-lg p-2.5 text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-40 text-[11px]">
              {result.body || '[Empty Payload Response]'}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};


