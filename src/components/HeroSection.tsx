import React, { useState } from 'react';
import { Play, Copy, Check, Terminal, RotateCw, ArrowDown } from 'lucide-react';
import { ChaosEndpoint } from '../types';
import { getEndpointOrigin } from '../lib/config';

interface HeroSectionProps {
  endpoint?: ChaosEndpoint | null;
  onGetChaosUrl: () => void;
  loading?: boolean;
}

interface ProbeResult {
  status: number | string;
  ok: boolean;
  durationMs: number;
  behavior: string;
  bodySnippet: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  endpoint,
  onGetChaosUrl,
  loading
}) => {
  const [copied, setCopied] = useState(false);
  const [probing, setProbing] = useState(false);
  const [lastProbe, setLastProbe] = useState<ProbeResult | null>(null);

  const origin = getEndpointOrigin();
  const fullEndpointUrl = endpoint?.slug ? `${origin}/e/${endpoint.slug}` : `${origin}/e/demo-chaos`;

  const copyUrl = () => {
    navigator.clipboard.writeText(fullEndpointUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Immediate 1-click test probe right in the hero
  const handleInstantProbe = async () => {
    if (probing) return;
    setProbing(true);
    const start = performance.now();

    try {
      const res = await fetch(fullEndpointUrl, {
        headers: { 'X-Hiccup-Test-Client': 'HeroInstantProbe' }
      });
      const durationMs = Math.round(performance.now() - start);
      const behavior = res.headers.get('x-hiccup-behavior') || res.headers.get('x-faultline-behavior') || (res.ok ? 'clean' : 'error');
      const text = await res.text();
      let preview = text.substring(0, 140);
      try {
        preview = JSON.stringify(JSON.parse(text), null, 2).substring(0, 140);
      } catch {
        /* keep raw preview */
      }

      setLastProbe({
        status: res.status,
        ok: res.ok,
        durationMs,
        behavior,
        bodySnippet: preview
      });
    } catch (err: unknown) {
      const durationMs = Math.round(performance.now() - start);
      const errMsg = err instanceof Error ? err.message : 'Connection reset';
      setLastProbe({
        status: 'DROPPED',
        ok: false,
        durationMs,
        behavior: 'socket_dropped',
        bodySnippet: `[TCP Connection Reset] ${errMsg}`
      });
    } finally {
      setProbing(false);
    }
  };

  return (
    <div className="pt-4 pb-10 border-b border-zinc-200/60 bg-gradient-to-b from-amber-500/5 via-amber-500/[0.02] to-transparent">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Value Prop & Immediate Test Bar */}
          <div className="lg:col-span-7 space-y-5">
            {/* Pill/Badge */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-800 text-xs font-mono font-medium shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Instant chaos URL • No signup required • Real TCP/HTTP simulation</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-extrabold text-zinc-900 tracking-tight leading-[1.12]">
              Networks break in production. <br />
              <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 bg-clip-text text-transparent">
                Find out if your code notices.
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg text-zinc-600 leading-relaxed max-w-xl font-normal">
              Hiccup gives you live mock endpoints that deliberately misbehave — injecting latency, socket drops, rate limits, and 500 errors so you can test retry and fallback logic with confidence.
            </p>

            {/* 10-Second Aha Bar */}
            <div className="bg-white border border-zinc-300/80 rounded-2xl p-3 sm:p-3.5 shadow-sm space-y-2.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Clean URL display */}
                <div className="flex-1 flex items-center bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 font-mono text-xs overflow-hidden">
                  <span className="text-zinc-400 text-[10px] uppercase font-bold mr-2 select-none shrink-0">
                    ANY
                  </span>
                  <span className="text-zinc-800 font-semibold truncate flex-1 select-all">
                    {fullEndpointUrl}
                  </span>
                  <button
                    onClick={copyUrl}
                    className="ml-2 px-2.5 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 shrink-0"
                    title="Copy URL"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold text-[11px]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-[11px]">Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Instant "Fire Test" Button */}
                <button
                  onClick={handleInstantProbe}
                  disabled={probing}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl transition-all shadow-sm flex items-center justify-center space-x-1.5 text-xs shrink-0 active:scale-95 disabled:opacity-60"
                  title="Fire an immediate test request to see how this endpoint responds right now"
                >
                  {probing ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{probing ? 'Probing...' : 'Try Live Now'}</span>
                </button>
              </div>

              {/* Instant feedback card if user pressed Try Live Now */}
              {lastProbe ? (
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono flex items-center justify-between text-zinc-200 animate-in fade-in duration-200">
                  <div className="flex items-center space-x-2 truncate">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      lastProbe.ok
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : lastProbe.status === 429
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : lastProbe.status === 'DROPPED'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>
                      {lastProbe.ok ? 'HTTP 200 OK' : typeof lastProbe.status === 'number' ? `HTTP ${lastProbe.status}` : lastProbe.status}
                    </span>
                    <span className="text-zinc-400 text-[11px]">
                      ⏱️ {lastProbe.durationMs}ms
                    </span>
                    <span className="text-amber-400/90 text-[11px] truncate hidden sm:inline">
                      ({lastProbe.behavior})
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 shrink-0">Click again to re-test</span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono px-1">
                  <span>Click <strong className="text-zinc-700">Try Live Now</strong> to see the injected chaos instantly.</span>
                  <span className="text-zinc-400 hidden sm:inline">Zero installation needed</span>
                </div>
              )}
            </div>

            {/* Action button */}
            <div className="flex items-center space-x-3 pt-1">
              <button
                onClick={onGetChaosUrl}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl transition-all shadow-2xs flex items-center space-x-1.5 text-xs"
              >
                <span>Customize Chaos Rules</span>
                <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          </div>

          {/* Right Column: Code Editor & Realistic Response Panel */}
          <div className="lg:col-span-5">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden font-mono text-xs text-zinc-200">
              {/* Window Bar */}
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800/80">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="text-[11px] text-zinc-400 flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-amber-500" />
                  <span>terminal-probe</span>
                </div>
                <div className="w-8" />
              </div>

              {/* Code Snippet Content */}
              <div className="p-4 space-y-3 bg-black/90">
                <div className="text-zinc-400 leading-relaxed select-all">
                  <span className="text-amber-400 font-bold select-none">$ </span>curl -i {fullEndpointUrl}
                </div>

                <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      HTTP/1.1 503 Service Unavailable
                    </span>
                    <span className="text-[10px] text-zinc-500">2,400ms delay</span>
                  </div>

                  <div className="text-[11px] text-zinc-500 space-y-0.5 pt-0.5 font-mono">
                    <div>x-hiccup-behavior: error_503</div>
                    <div>retry-after: 15</div>
                    <div>content-type: application/json</div>
                  </div>

                  <pre className="mt-1.5 p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800/80 text-amber-300 text-[11px] overflow-x-auto leading-relaxed">
{`{
  "error": "PaymentGatewayTimeout",
  "message": "Simulated upstream failure",
  "hiccupInjected": true
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
