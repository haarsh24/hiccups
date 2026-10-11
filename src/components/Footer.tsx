import React from 'react';
import { Heart, Activity, ExternalLink, ShieldCheck, Zap, Terminal } from 'lucide-react';

interface FooterProps {
  onOpenDocs: () => void;
  onOpenPresets: () => void;
  onScrollToPlayground: () => void;
  onScrollToConfigurator: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenDocs,
  onOpenPresets,
  onScrollToPlayground,
  onScrollToConfigurator
}) => {
  return (
    <footer className="mt-20 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md text-zinc-400 font-sans text-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Top row: Brand summary & Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-800/60">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap className="w-3.5 h-3.5" />
              </span>
              <span className="font-bold text-sm text-zinc-100 tracking-tight font-sans">
                Hiccup
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                v1.2.0
              </span>
            </div>
            <p className="text-zinc-500 text-xs max-w-sm">
              Instant, configurable network chaos & reliability testing sandbox for microservices, SDKs, and frontend apps.
            </p>
          </div>

          {/* Minimal Live Status Badge */}
          <div className="flex items-center space-x-3">
            <a
              href="/health"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300 hover:border-zinc-700 transition-colors group"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Chaos Engine Active</span>
              <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            </a>
          </div>
        </div>

        {/* Middle row: Quick links & developer tools */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 font-mono text-[11px]">
          <div>
            <h4 className="text-zinc-200 uppercase tracking-wider text-[10px] font-semibold mb-2.5">
              Testing Suite
            </h4>
            <ul className="space-y-1.5 text-zinc-400">
              <li>
                <button
                  onClick={onScrollToPlayground}
                  className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                >
                  In-Browser Playground
                </button>
              </li>
              <li>
                <button
                  onClick={onScrollToConfigurator}
                  className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                >
                  Chaos Rules Config
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenPresets}
                  className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                >
                  Real-World Scenarios
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-zinc-200 uppercase tracking-wider text-[10px] font-semibold mb-2.5">
              Fault Injections
            </h4>
            <ul className="space-y-1.5 text-zinc-400">
              <li>Latency & Jitter</li>
              <li>TCP Drops & Reset</li>
              <li>Silent Socket Hang</li>
              <li>Rate Limits (429)</li>
            </ul>
          </div>

          <div>
            <h4 className="text-zinc-200 uppercase tracking-wider text-[10px] font-semibold mb-2.5">
              Resources
            </h4>
            <ul className="space-y-1.5 text-zinc-400">
              <li>
                <button
                  onClick={onOpenDocs}
                  className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                >
                  Quickstart Guide
                </button>
              </li>
              <li>
                <a
                  href="/manus-routes.json"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-400 transition-colors inline-flex items-center space-x-1"
                >
                  <span>Route Manifest</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                </a>
              </li>
              <li>
                <a
                  href="/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-400 transition-colors inline-flex items-center space-x-1"
                >
                  <span>Health Check</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-zinc-200 uppercase tracking-wider text-[10px] font-semibold mb-2.5">
              Guarantees
            </h4>
            <ul className="space-y-1.5 text-zinc-400">
              <li className="flex items-center space-x-1 text-emerald-400/90">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Zero Sign-Up Required</span>
              </li>
              <li>Private Anon Sessions</li>
              <li>CORS Enabled Everywhere</li>
            </ul>
          </div>
        </div>

        {/* Bottom row: Made with love by Harsh */}
        <div className="pt-6 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs">
          <p className="flex items-center justify-center sm:justify-start space-x-1.5 text-zinc-400">
            <span>Made with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse inline-block" />
            <span>by</span>
            <a
              href="https://kumarharsh.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-zinc-200 hover:text-amber-400 transition-colors underline decoration-zinc-700 underline-offset-4 hover:decoration-amber-400"
            >
              Harsh
            </a>
          </p>

          <p className="text-[11px] font-mono text-zinc-500">
            Open Control Plane • Built for resilient engineering
          </p>
        </div>
      </div>
    </footer>
  );
};
