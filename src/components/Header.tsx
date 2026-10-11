import React, { useState } from 'react';
import { Plus, Sparkles, BookOpen, ChevronDown, Zap, Play, Menu, X, Globe } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeEndpoint = endpoints.find(e => e.id === activeEndpointId);

  const handleSelectAndClose = (id: string) => {
    onSelectEndpoint(id);
    setMobileMenuOpen(false);
  };

  const handleCustomSlugAndClose = () => {
    onCreateNamed();
    setMobileMenuOpen(false);
  };

  const handlePresetsAndClose = () => {
    onOpenPresets();
    setMobileMenuOpen(false);
  };

  const handleDocsAndClose = () => {
    onOpenDocs();
    setMobileMenuOpen(false);
  };

  const handlePlaygroundAndClose = () => {
    onGoToPlayground();
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-zinc-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
        {/* Brand Logo */}
        <div className="flex items-center space-x-2 shrink-0">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center space-x-2 group cursor-pointer"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/10 group-hover:bg-amber-600 transition-colors" />
            <span className="font-bold text-base sm:text-lg tracking-tight text-zinc-900 font-mono">
              Hiccups
            </span>
          </a>
          <span className="text-[10px] sm:text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/60 rounded px-1.5 py-0.5 font-mono hidden sm:inline">
            chaos engine
          </span>
        </div>

        {/* Desktop Center / Endpoint Switcher */}
        <div className="hidden lg:flex items-center space-x-2">
          <div className="relative flex items-center">
            <select
              value={activeEndpointId || ''}
              onChange={(e) => onSelectEndpoint(e.target.value)}
              disabled={endpoints.length === 0}
              className="appearance-none bg-zinc-50 border border-zinc-200 hover:border-zinc-300 text-zinc-800 text-xs font-mono rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors cursor-pointer shadow-2xs disabled:opacity-60 max-w-[200px] truncate"
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
            className="text-xs font-mono text-zinc-700 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center space-x-1 shadow-2xs whitespace-nowrap cursor-pointer"
            title="Create Custom Named Endpoint with specific slug"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-500" />
            <span>+ Custom Slug</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Playground Top Nav Link */}
          <button
            onClick={onGoToPlayground}
            className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg transition-all flex items-center space-x-1 sm:space-x-1.5 shadow-2xs cursor-pointer"
            title="Open In-Browser Live Chaos Playground"
          >
            <Play className="w-3.5 h-3.5 text-amber-600 fill-amber-500 shrink-0" />
            <span className="hidden xs:inline sm:inline">Playground</span>
            <span className="inline xs:hidden sm:hidden">Play</span>
          </button>

          {/* Desktop Presets & Docs */}
          <button
            onClick={onOpenPresets}
            className="hidden md:flex px-2.5 sm:px-3 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-all items-center space-x-1.5 shadow-2xs cursor-pointer"
            title="Load Pre-configured Network Scenarios"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Presets</span>
          </button>

          <button
            onClick={onOpenDocs}
            className="hidden md:flex px-2.5 sm:px-3 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-all items-center space-x-1.5 shadow-2xs cursor-pointer"
            title="View Hiccups Architecture & Integration Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
            <span>Docs</span>
          </button>

          {/* Quick Sandbox Endpoint Button */}
          <button
            onClick={onCreatePlayground}
            disabled={loading}
            className="px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-all flex items-center space-x-1 sm:space-x-1.5 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            title="Instantly generate 24-hour sandbox endpoint with zero form fields"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">+ Quick Endpoint</span>
            <span className="inline sm:hidden">+ Quick</span>
          </button>

          {/* Mobile / Tablet Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="lg:hidden p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-colors cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            title="More actions & endpoint switch"
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-zinc-200 bg-white/98 px-4 py-3.5 space-y-3.5 shadow-lg animate-in slide-in-from-top-2 duration-150">
          {/* Active Endpoint Information & Switcher */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
              <span className="flex items-center space-x-1">
                <Globe className="w-3.5 h-3.5 text-zinc-400" />
                <span>Active Endpoint:</span>
              </span>
              <span className="text-[11px] font-semibold text-amber-600">
                {activeEndpoint?.slug || 'none'}
              </span>
            </div>

            <div className="relative">
              <select
                value={activeEndpointId || ''}
                onChange={(e) => handleSelectAndClose(e.target.value)}
                disabled={endpoints.length === 0}
                className="w-full appearance-none bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs font-mono rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
              >
                {endpoints.length === 0 ? (
                  <option value="" disabled>No endpoints yet</option>
                ) : (
                  endpoints.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.name} ({ep.slug}) {ep.isDemo ? '• Demo' : ''}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Quick Action Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs font-medium">
            <button
              onClick={handleCustomSlugAndClose}
              className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-500" />
              <span>+ Custom Slug</span>
            </button>

            <button
              onClick={handlePresetsAndClose}
              className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-800 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Presets</span>
            </button>

            <button
              onClick={handlePlaygroundAndClose}
              className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-amber-900 transition-colors"
            >
              <Play className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span>Playground</span>
            </button>

            <button
              onClick={handleDocsAndClose}
              className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-800 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
              <span>Documentation</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
