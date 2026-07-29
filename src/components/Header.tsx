import React from 'react';
import { Plus, Sparkles, BookOpen, ChevronDown, Zap, Github, Play } from 'lucide-react';
import { ChaosEndpoint } from '../types';

interface HeaderProps {
  endpoints: ChaosEndpoint[];
  activeEndpointId: string;
  onSelectEndpoint: (id: string) => void;
  onCreatePlayground: () => void;
  onCreateNamed: () => void;
  onOpenPresets: () => void;
  onOpenDocs: () => void;
  onGoToPlayground: () => void;
  loading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  endpoints,
  activeEndpointId,
  onSelectEndpoint,
  onCreatePlayground,
  onCreateNamed,
  onOpenPresets,
  onOpenDocs,
  onGoToPlayground,
  loading
}) => {
  return (
    <header className="border-b border-zinc-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/10" />
            <span className="font-bold text-base tracking-tight text-zinc-900 font-mono">
              hiccup
            </span>
            <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
              .dev
            </span>
          </div>
        </div>

        {/* Center / Endpoint Switcher */}
        <div className="hidden md:flex items-center space-x-2">
          <div className="relative flex items-center">
            <select
              value={activeEndpointId || ''}
              onChange={(e) => onSelectEndpoint(e.target.value)}
              disabled={endpoints.length === 0}
              className="appearance-none bg-zinc-50 border border-zinc-200 hover:border-zinc-300 text-zinc-800 text-xs font-mono rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
              title="Select Active Chaos Endpoint"
            >
              {endpoints.length === 0 ? (
                <option value="" disabled>No endpoints yet</option>
              ) : (
                endpoints.map((ep) => (
                  <option key={ep.id} value={ep.id} className="bg-white text-zinc-800">
                    {ep.name} ({ep.slug})
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 pointer-events-none" />
          </div>

          <button
            onClick={onCreateNamed}
            className="text-xs font-mono text-zinc-700 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center space-x-1 shadow-2xs"
            title="Create Custom Named Endpoint with specific slug"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-500" />
            <span>+ Custom Slug</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Playground Top Nav Link */}
          <button
            onClick={onGoToPlayground}
            className="px-3 py-1.5 text-xs font-semibold text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg transition-all flex items-center space-x-1.5 shadow-2xs"
            title="Open In-Browser Live Chaos Playground"
          >
            <Play className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span>Playground</span>
          </button>

          <button
            onClick={onOpenPresets}
            className="px-3 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-all flex items-center space-x-1.5 shadow-2xs"
            title="Load Pre-configured Network Scenarios"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Presets</span>
          </button>

          <button
            onClick={onOpenDocs}
            className="px-3 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-all flex items-center space-x-1.5 shadow-2xs"
            title="View Hiccup Architecture & Integration Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Docs</span>
          </button>

          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="p-1.5 text-zinc-500 hover:text-zinc-800 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-colors flex items-center space-x-1"
            title="Source Code (GitHub Repository)"
          >
            <Github className="w-4 h-4" />
            <span className="sr-only">GitHub Repository</span>
          </a>

          {/* 1-click Quick Endpoint Button */}
          <button
            onClick={onCreatePlayground}
            disabled={loading}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-all flex items-center space-x-1.5 shadow-sm active:scale-95 disabled:opacity-50"
            title="Instantly generate 24-hour sandbox endpoint with zero form fields"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Quick Endpoint</span>
          </button>
        </div>
      </div>
    </header>
  );
};


