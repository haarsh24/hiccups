import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChaosEndpoint, RequestLog, EndpointStats, ChaosRule } from './types';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { HowItWorks } from './components/HowItWorks';
import { ChaosConfigurator } from './components/ChaosConfigurator';
import { EndpointHeader } from './components/EndpointHeader';
import { StatsOverview } from './components/StatsOverview';
import { LiveTester } from './components/LiveTester';
import { CodeSnippets } from './components/CodeSnippets';
import { RequestInspector } from './components/RequestInspector';
import { PresetModal } from './components/PresetModal';
import { NewEndpointModal } from './components/NewEndpointModal';
import { DocsModal } from './components/DocsModal';
import { Activity, ChevronDown, ChevronUp, Terminal, Sliders, Play } from 'lucide-react';

export default function App() {
  const [endpoints, setEndpoints] = useState<ChaosEndpoint[]>([]);
  const [activeEndpointId, setActiveEndpointId] = useState<string>('');
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [stats, setStats] = useState<EndpointStats | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);
  const [showTelemetry, setShowTelemetry] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'workbench' | 'telemetry' | 'code'>('workbench');

  // Modals
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [newEndpointModalOpen, setNewEndpointModalOpen] = useState(false);
  const [docsModalOpen, setDocsModalOpen] = useState(false);

  const configuratorRef = useRef<HTMLDivElement>(null);

  // Fetch Endpoints
  const fetchEndpoints = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/endpoints');
      const data = await res.json();
      if (data.success && data.endpoints) {
        setEndpoints(data.endpoints);
        if (!activeEndpointId && data.endpoints.length > 0) {
          setActiveEndpointId(data.endpoints[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch endpoints:', err);
    } finally {
      setLoading(false);
    }
  }, [activeEndpointId]);

  useEffect(() => {
    fetchEndpoints();
  }, [fetchEndpoints]);

  // Active Endpoint
  const activeEndpoint = endpoints.find(e => e.id === activeEndpointId) || endpoints[0];

  // Fetch Telemetry Logs & Stats for active endpoint
  const fetchTelemetry = useCallback(async () => {
    if (!activeEndpoint) return;
    try {
      setLogsLoading(true);
      const [logsRes, statsRes] = await Promise.all([
        fetch(`/api/v1/endpoints/${activeEndpoint.id}/logs`),
        fetch(`/api/v1/endpoints/${activeEndpoint.id}/stats`)
      ]);

      const logsData = await logsRes.json();
      const statsData = await statsRes.json();

      if (logsData.success) setLogs(logsData.logs || []);
      if (statsData.success) setStats(statsData.stats || null);
    } catch (err) {
      console.error('Failed to fetch telemetry:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [activeEndpoint]);

  useEffect(() => {
    if (activeEndpoint) {
      fetchTelemetry();
      const interval = setInterval(fetchTelemetry, 2500);
      return () => clearInterval(interval);
    }
  }, [activeEndpoint, fetchTelemetry]);

  // Create Playground Endpoint (1-click)
  const handleCreatePlayground = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/playground', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.endpoint) {
        setEndpoints(prev => [data.endpoint, ...prev]);
        setActiveEndpointId(data.endpoint.id);
        
        // Scroll to configurator
        setTimeout(() => {
          configuratorRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Failed to create playground endpoint:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create Named Persistent Endpoint
  const handleCreateNamedEndpoint = async (name: string, customSlug?: string, presetId?: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, customSlug, presetId })
      });
      const data = await res.json();
      if (data.success && data.endpoint) {
        setEndpoints(prev => [data.endpoint, ...prev]);
        setActiveEndpointId(data.endpoint.id);

        setTimeout(() => {
          configuratorRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Failed to create named endpoint:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update Master Flaky Percentage
  const handleUpdateFlakyPercentage = async (val: number) => {
    if (!activeEndpoint) return;
    try {
      const res = await fetch(`/api/v1/endpoints/${activeEndpoint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flakyPercentage: val })
      });
      const data = await res.json();
      if (data.success && data.endpoint) {
        setEndpoints(prev => prev.map(e => e.id === data.endpoint.id ? data.endpoint : e));
      }
    } catch (err) {
      console.error('Failed to update flaky percentage:', err);
    }
  };

  // Update Individual Chaos Rule
  const handleUpdateRule = async (ruleId: string, updated: Partial<ChaosRule>) => {
    if (!activeEndpoint) return;
    const updatedRules = activeEndpoint.rules.map(r => r.id === ruleId ? { ...r, ...updated } : r);

    try {
      const res = await fetch(`/api/v1/endpoints/${activeEndpoint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: updatedRules })
      });
      const data = await res.json();
      if (data.success && data.endpoint) {
        setEndpoints(prev => prev.map(e => e.id === data.endpoint.id ? data.endpoint : e));
      }
    } catch (err) {
      console.error('Failed to update rule:', err);
    }
  };

  // Apply Preset Profile
  const handleApplyPreset = async (presetId: string) => {
    if (!activeEndpoint) return;
    try {
      const res = await fetch(`/api/v1/endpoints/${activeEndpoint.id}/apply-preset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId })
      });
      const data = await res.json();
      if (data.success && data.endpoint) {
        setEndpoints(prev => prev.map(e => e.id === data.endpoint.id ? data.endpoint : e));
      }
    } catch (err) {
      console.error('Failed to apply preset:', err);
    }
  };

  // Clear Request Logs
  const handleClearLogs = async () => {
    if (!activeEndpoint) return;
    try {
      await fetch(`/api/v1/endpoints/${activeEndpoint.id}/logs`, { method: 'DELETE' });
      setLogs([]);
      fetchTelemetry();
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  // Delete Endpoint
  const handleDeleteEndpoint = async () => {
    if (!activeEndpoint || activeEndpoint.isAnonymous) return;
    if (!confirm(`Are you sure you want to delete endpoint '${activeEndpoint.name}'?`)) return;

    try {
      await fetch(`/api/v1/endpoints/${activeEndpoint.id}`, { method: 'DELETE' });
      const remaining = endpoints.filter(e => e.id !== activeEndpoint.id);
      setEndpoints(remaining);
      if (remaining.length > 0) {
        setActiveEndpointId(remaining[0].id);
      }
    } catch (err) {
      console.error('Failed to delete endpoint:', err);
    }
  };

  const scrollToConfigurator = () => {
    if (configuratorRef.current) {
      configuratorRef.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      handleCreatePlayground();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans antialiased selection:bg-amber-100 selection:text-amber-900">
      {/* Top Header */}
      <Header
        endpoints={endpoints}
        activeEndpointId={activeEndpointId}
        onSelectEndpoint={setActiveEndpointId}
        onCreatePlayground={handleCreatePlayground}
        onCreateNamed={() => setNewEndpointModalOpen(true)}
        onOpenPresets={() => setPresetModalOpen(true)}
        onOpenDocs={() => setDocsModalOpen(true)}
        loading={loading}
      />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
        {/* 1. Hero Section (Above Fold) */}
        <HeroSection
          endpoint={activeEndpoint}
          onGetChaosUrl={scrollToConfigurator}
          loading={loading}
        />

        {/* 2. How It Works (3 steps) */}
        <HowItWorks />

        {/* 3. Chaos Configurator */}
        <div ref={configuratorRef} className="space-y-6 pt-4">
          {activeEndpoint ? (
            <div className="space-y-6">
              <EndpointHeader
                endpoint={activeEndpoint}
                onUpdateFlakyPercentage={handleUpdateFlakyPercentage}
                onApplyPresetModal={() => setPresetModalOpen(true)}
                onResetStats={handleClearLogs}
                onDeleteEndpoint={handleDeleteEndpoint}
              />

              <ChaosConfigurator
                endpoint={activeEndpoint}
                onUpdateRule={handleUpdateRule}
              />
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-zinc-200">
              <p className="text-zinc-500 text-sm">Loading or creating your chaos endpoint...</p>
            </div>
          )}
        </div>

        {/* 4. Telemetry & Live Testing (Below Fold - Collapsible/Toggleable) */}
        {activeEndpoint && (
          <div className="pt-6 border-t border-zinc-200/80 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-amber-600" />
                  <span>Telemetry & Live Test Workbench</span>
                </h3>
                <p className="text-sm text-zinc-500 mt-1">
                  Inspect real-time request logs, test endpoint behavior interactively, or copy code integration snippets.
                </p>
              </div>

              <button
                onClick={() => setShowTelemetry(prev => !prev)}
                className="inline-flex items-center space-x-2 text-xs font-semibold px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800 transition-colors shadow-2xs self-start sm:self-auto"
              >
                <span>{showTelemetry ? 'Hide Telemetry' : 'View Stats & Telemetry'}</span>
                {showTelemetry ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showTelemetry && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Stats Cards */}
                <StatsOverview stats={stats} />

                {/* Tab Navigation for Workbench */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-2 sm:p-3 shadow-2xs">
                  <div className="flex items-center space-x-2 border-b border-zinc-100 pb-2.5 mb-4">
                    <button
                      onClick={() => setActiveTab('workbench')}
                      className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'workbench'
                          ? 'bg-zinc-900 text-white shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Live Probe Workbench</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('telemetry')}
                      className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'telemetry'
                          ? 'bg-zinc-900 text-white shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Request Logs ({logs.length})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('code')}
                      className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'code'
                          ? 'bg-zinc-900 text-white shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Integration Snippets</span>
                    </button>
                  </div>

                  <div>
                    {activeTab === 'workbench' && (
                      <LiveTester
                        endpoint={activeEndpoint}
                        onRefreshLogs={fetchTelemetry}
                      />
                    )}

                    {activeTab === 'telemetry' && (
                      <RequestInspector
                        logs={logs}
                        onRefresh={fetchTelemetry}
                        onClearLogs={handleClearLogs}
                        loading={logsLoading}
                      />
                    )}

                    {activeTab === 'code' && (
                      <CodeSnippets endpoint={activeEndpoint} />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <PresetModal
        isOpen={presetModalOpen}
        onClose={() => setPresetModalOpen(false)}
        onApplyPreset={handleApplyPreset}
      />

      <NewEndpointModal
        isOpen={newEndpointModalOpen}
        onClose={() => setNewEndpointModalOpen(false)}
        onCreateEndpoint={handleCreateNamedEndpoint}
      />

      <DocsModal
        isOpen={docsModalOpen}
        onClose={() => setDocsModalOpen(false)}
      />
    </div>
  );
}

