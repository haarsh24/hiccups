import React, { useState } from 'react';
import { Copy, Check, ExternalLink, ArrowRight, Terminal } from 'lucide-react';
import { ChaosEndpoint } from '../types';
import { getEndpointOrigin } from '../lib/config';

interface HeroSectionProps {
  endpoint?: ChaosEndpoint | null;
  onGetChaosUrl: () => void;
  loading?: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  endpoint,
  onGetChaosUrl,
  loading
}) => {
  const [copied, setCopied] = useState(false);
  const origin = getEndpointOrigin();
  const fullEndpointUrl = endpoint?.slug ? `${origin}/e/${endpoint.slug}` : `${origin}/e/demo-chaos`;

  const copyUrl = () => {
    navigator.clipboard.writeText(fullEndpointUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pt-8 pb-12 border-b border-zinc-200/60 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Value Prop & CTA */}
          <div className="lg:col-span-7 space-y-6">
            {/* Pill/Badge */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>free · instant · no signup required</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-zinc-900 tracking-tight leading-[1.15]">
              Networks fail. <br />
              <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 bg-clip-text text-transparent">
                Find out if your code notices.
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg text-zinc-600 leading-relaxed max-w-xl font-normal">
              Hiccup gives you a URL that misbehaves — slow, error-prone, connection-dropping — so you can test retry and timeout logic without building your own flaky server.
            </p>

            {/* Primary Action Row */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={onGetChaosUrl}
                  className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2 text-sm group"
                >
                  <span>Get Instant Chaos URL</span>
                  <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <div className="flex-1 flex items-center bg-white border border-zinc-300/80 rounded-xl px-3 py-2 shadow-2xs font-mono text-xs">
                  <span className="text-zinc-400 text-[10px] uppercase font-bold mr-2 select-none">
                    ANY
                  </span>
                  <span className="text-zinc-700 truncate flex-1 font-mono">
                    {fullEndpointUrl}
                  </span>
                  <button
                    onClick={copyUrl}
                    className="ml-2 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-md font-medium transition-colors flex items-center space-x-1 shrink-0"
                    title="Copy Endpoint URL"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 text-[11px]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-[11px]">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-xs text-zinc-500 font-mono pt-1">
                <span className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Real HTTP/TCP socket simulation</span>
                </span>
                <span>•</span>
                <span>24h TTL or persistent</span>
              </div>
            </div>
          </div>

          {/* Right Column: Code Editor Preview Panel */}
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
                  <span>hiccup-probe.sh</span>
                </div>
                <div className="w-10" />
              </div>

              {/* Code Snippet Content */}
              <div className="p-4 space-y-3 bg-black/90">
                <div className="text-zinc-400 leading-relaxed">
                  <span className="text-amber-400 font-bold">$</span> curl -i {fullEndpointUrl}
                </div>

                <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      HTTP/1.1 503 Service Unavailable
                    </span>
                    <span className="text-[10px] text-zinc-500">2400ms delay</span>
                  </div>

                  <div className="text-[11px] text-zinc-500 space-y-0.5 pt-1 font-mono">
                    <div>x-hiccup-behavior: error (503)</div>
                    <div>content-type: application/json</div>
                    <div>date: {new Date().toUTCString()}</div>
                  </div>

                  <pre className="mt-2 p-2.5 rounded bg-zinc-900/90 border border-zinc-800/80 text-amber-300 text-[11px] overflow-x-auto">
{`{
  "error": "ServiceUnavailable",
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
