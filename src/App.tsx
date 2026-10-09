import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChaosEndpoint, RequestLog, EndpointStats, ChaosRule } from './types';
import { PRESET_PROFILES } from './data/presets';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { HowItWorks } from './components/HowItWorks';
import { PostCreationCard } from './components/PostCreationCard';
import { PresetBar } from './components/PresetBar';
import { ChaosConfigurator } from './components/ChaosConfigurator';
import { EndpointHeader } from './components/EndpointHeader';
import { StatsOverview } from './components/StatsOverview';
import { LiveTester } from './components/LiveTester';
import { CodeSnippets } from './components/CodeSnippets';
import { RequestInspector } from './components/RequestInspector';
import { PresetModal } from './components/PresetModal';
import { NewEndpointModal } from './components/NewEndpointModal';
import { DocsModal } from './components/DocsModal';
import { Playground } from './components/Playground';
import { Activity, ChevronDown, ChevronUp, Terminal, Play, AlertCircle, RefreshCw, ArrowUp, CheckCircle2 } from 'lucide-react';
import { getApiUrl, getDefaultApiHeaders } from './lib/config';

const CACHED_ENDPOINTS_KEY = 'hiccups_user_endpoints_cache';

function loadCachedEndpoints(): ChaosEndpoint[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CACHED_ENDPOINTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCachedEndpoints(eps: ChaosEndpoint[]) {
  if (typeof window === 'undefined') return;
  try {
    const toSave = eps.filter(e => !e.isDemo);
    localStorage.setItem(CACHED_ENDPOINTS_KEY, JSON.stringify(toSave));
  } catch {
    // Ignore storage errors
  }
}

export default function App() {
  const [endpoints, setEndpoints] = useState<ChaosEndpoint[]>(() => {
    const cached = loadCachedEndpoints();
    return cached.length > 0 ? cached : [];
  });
  const [activeEndpointId, setActiveEndpointId] = useState<string>(() => {
    const cached = loadCachedEndpoints();
    return cached.length > 0 ? cached[0].id : '';
  });
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [stats, setStats] = useState<EndpointStats | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [loadingPresetId, setLoadingPresetId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [initError, setInitError] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);
  const [showTelemetry, setShowTelemetry] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'workbench' | 'telemetry' | 'code'>('workbench');

  // Modals
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [newEndpointModalOpen, setNewEndpointModalOpen] = useState(false);
  const [docsModalOpen, setDocsModalOpen] = useState(false);

  const configuratorRef = useRef<HTMLDivElement>(null);
  const playgroundRef = useRef<HTMLDivElement>(null);

  // Fetch Endpoints
  const fetchEndpoints = useCallback(async () => {
    try {
      setLoading(true);
      setInitError(null);
      const url = getApiUrl('/api/v1/endpoints');
      const res = await fetch(url, { headers: getDefaultApiHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Invalid content type '${contentType || 'none'}', expected application/json`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.endpoints)) {
        const serverEndpoints: ChaosEndpoint[] = data.endpoints;
        const cached = loadCachedEndpoints();

        // Merge: keep all server endpoints, plus any locally cached endpoints not yet on this server instance
        const serverIds = new Set(serverEndpoints.map(e => e.id));
        const missingOnServer = cached.filter(e => !serverIds.has(e.id));

        const combined = [...serverEndpoints];
        for (const m of missingOnServer) {
          combined.push(m);
        }

        // If serverless container cold-started without local endpoints, re-sync them
        if (missingOnServer.length > 0) {
          fetch(getApiUrl('/api/v1/endpoints/sync'), {
            method: 'POST',
            headers: getDefaultApiHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ endpoints: missingOnServer })
          }).catch(() => {});
        }

        setEndpoints(combined);
        saveCachedEndpoints(combined);

        if (combined.length > 0) {
          const exists = combined.some((e: ChaosEndpoint) => e.id === activeEndpointId);
          if (!exists || !activeEndpointId) {
            setActiveEndpointId(combined[0].id);
          }
        }
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Unknown network error';
      console.error('Failed to fetch endpoints from backend:', err);
      const cached = loadCachedEndpoints();
      if (cached.length === 0) {
        setInitError(`Could not reach Hiccup chaos server (${msg}). Please verify your connection or refresh the page.`);
      }
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
    if (!activeEndpoint || !activeEndpoint.id) return;
    try {
      setLogsLoading(true);
      const headers = getDefaultApiHeaders();
      const [logsRes, statsRes] = await Promise.all([
        fetch(getApiUrl(`/api/v1/endpoints/${encodeURIComponent(activeEndpoint.id)}/logs`), { headers }),
        fetch(getApiUrl(`/api/v1/endpoints/${encodeURIComponent(activeEndpoint.id)}/stats`), { headers })
      ]);

      if (logsRes.ok) {
        const ct = logsRes.headers.get('content-type');
        if (ct && ct.includes('application/json')) {
          const logsData = await logsRes.json();
          if (logsData.success) {
            setLogs(logsData.logs || []);
          }
        }
      }

      if (statsRes.ok) {
        const ct = statsRes.headers.get('content-type');
        if (ct && ct.includes('application/json')) {
          const statsData = await statsRes.json();
          if (statsData.success) {
            setStats(statsData.stats || null);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [activeEndpoint]);

  useEffect(() => {
    fetchTelemetry();
  }, [activeEndpoint, fetchTelemetry]);

  // Create Playground Endpoint (1-click 24h Sandbox)
  const handleCreatePlayground = async (initialPresetId?: string) => {
    try {
      setLoading(true);
      setInitError(null);
      const targetUrl = getApiUrl('/api/v1/playground');
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: getDefaultApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ presetId: initialPresetId })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const data = await res.json();
      if (data.success && data.endpoint) {
        setEndpoints(prev => {
          const next = [data.endpoint, ...prev];
          saveCachedEndpoints(next);
          return next;
        });
        setActiveEndpointId(data.endpoint.id);
        
        setToastMessage(`Created new sandbox: /e/${data.endpoint.slug}`);
        setTimeout(() => setToastMessage(null), 4000);

        // Scroll to configurator
        setTimeout(() => {
          configuratorRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        throw new Error(data.message || 'Creation failed');
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Network request failed';
      console.error('Failed to generate 24h Quick Sandbox endpoint:', err);
      setInitError(`Failed to generate 24h Quick Sandbox endpoint (${msg}). Check console for details.`);
    } finally {
      setLoading(false);
    }
  };

  // Create Named Persistent Endpoint
  const handleCreateNamedEndpoint = async (name: string, customSlug?: string, presetId?: string) => {
    try {
      setLoading(true);
      setInitError(null);
      const res = await fetch(getApiUrl('/api/v1/endpoints'), {
        method: 'POST',
        headers: getDefaultApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name, customSlug, presetId })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const data = await res.json();
      if (data.success && data.endpoint) {
        setEndpoints(prev => {
          const next = [data.endpoint, ...prev];
          saveCachedEndpoints(next);
          return next;
        });
        setActiveEndpointId(data.endpoint.id);
        setToastMessage(`Created endpoint: /e/${data.endpoint.slug}`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err) {
      console.error('Failed to create custom named endpoint:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update Flaky Percentage
  const handleUpdateFlakyPercentage = async (val: number) => {
    if (!activeEndpoint) return;
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeEndpoint.managementToken) {
        extraHeaders['X-Management-Token'] = activeEndpoint.managementToken;
        extraHeaders['X-Hiccup-Management-Token'] = activeEndpoint.managementToken;
      }
      const res = await fetch(getApiUrl(`/api/v1/endpoints/${encodeURIComponent(activeEndpoint.id)}`), {
        method: 'PATCH',
        headers: getDefaultApiHeaders(extraHeaders),
        body: JSON.stringify({ flakyPercentage: val })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.endpoint) {
          setEndpoints(prev => {
            const next = prev.map(e => e.id === data.endpoint.id ? data.endpoint : e);
            saveCachedEndpoints(next);
            return next;
          });
        }
      }
    } catch (err) {
      console.error('Failed to update flaky percentage:', err);
    }
  };

  // Update Single Chaos Rule
  const handleUpdateRule = async (ruleId: string, updated: Partial<ChaosRule>) => {
    if (!activeEndpoint) return;
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeEndpoint.managementToken) {
        extraHeaders['X-Management-Token'] = activeEndpoint.managementToken;
        extraHeaders['X-Hiccup-Management-Token'] = activeEndpoint.managementToken;
      }
      const res = await fetch(getApiUrl(`/api/v1/endpoints/${encodeURIComponent(activeEndpoint.id)}/rules/${encodeURIComponent(ruleId)}`), {
        method: 'PATCH',
        headers: getDefaultApiHeaders(extraHeaders),
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.endpoint) {
          setEndpoints(prev => {
            const next = prev.map(e => e.id === data.endpoint.id ? data.endpoint : e);
            saveCachedEndpoints(next);
            return next;
          });
        }
      }
    } catch (err) {
      console.error('Failed to update rule:', err);
    }
  };

  // Apply Preset Profile with automatic sandbox creation if on demo
  const handleApplyPreset = async (presetId: string) => {
    const preset = PRESET_PROFILES.find(p => p.id === presetId);
    const presetName = preset?.name || 'Selected Scenario';

    // If active endpoint is Demo (read-only on server), seamlessly create a new sandbox with this preset
    if (!activeEndpoint || activeEndpoint.isDemo) {
      try {
        setLoadingPresetId(presetId);
        const res = await fetch(getApiUrl('/api/v1/playground'), {
          method: 'POST',
          headers: getDefaultApiHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ presetId })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.endpoint) {
            setEndpoints(prev => {
              const next = [data.endpoint, ...prev];
              saveCachedEndpoints(next);
              return next;
            });
            setActiveEndpointId(data.endpoint.id);
            setToastMessage(`Created new sandbox with '${presetName}' active!`);
            setTimeout(() => setToastMessage(null), 4000);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to create preset sandbox:', err);
      } finally {
        setLoadingPresetId(null);
      }
    }

    // Otherwise apply directly to the active user endpoint
    try {
      setLoadingPresetId(presetId);
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeEndpoint.managementToken) {
        extraHeaders['X-Management-Token'] = activeEndpoint.managementToken;
        extraHeaders['X-Hiccup-Management-Token'] = activeEndpoint.managementToken;
      }
      const res = await fetch(getApiUrl(`/api/v1/endpoints/${encodeURIComponent(activeEndpoint.id)}/apply-preset`), {
        method: 'POST',
        headers: getDefaultApiHeaders(extraHeaders),
        body: JSON.stringify({ presetId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.endpoint) {
          setEndpoints(prev => {
            const next = prev.map(e => e.id === data.endpoint.id ? data.endpoint : e);
            saveCachedEndpoints(next);
            return next;
          });
          setToastMessage(`Applied '${presetName}' (${preset?.flakyPercentage}% chaos)`);
          setTimeout(() => setToastMessage(null), 4000);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setToastMessage(`Could not apply scenario: ${errData.error || 'Request failed'}`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err) {
      console.error('Failed to apply preset:', err);
    } finally {
      setLoadingPresetId(null);
    }
  };

  // Clear Request Logs
  const handleClearLogs = async () => {
    if (!activeEndpoint) return;
    try {
      await fetch(getApiUrl(`/api/v1/endpoints/${encodeURIComponent(activeEndpoint.id)}/logs`), {
        method: 'DELETE',
        headers: getDefaultApiHeaders()
      });
      setLogs([]);
      fetchTelemetry();
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  // Delete Endpoint
  const handleDeleteEndpoint = async () => {
    if (!activeEndpoint) return;
    if (activeEndpoint.isDemo) {
      alert('The Demo Chaos Endpoint is a permanent shared showcase and cannot be deleted.');
      return;
    }
    if (!confirm(`Are you sure you want to delete endpoint '${activeEndpoint.name}'?`)) return;

    try {
      const extraHeaders: Record<string, string> = {};
      if (activeEndpoint.managementToken) {
        extraHeaders['X-Management-Token'] = activeEndpoint.managementToken;
        extraHeaders['X-Hiccup-Management-Token'] = activeEndpoint.managementToken;
      }
      const res = await fetch(getApiUrl(`/api/v1/endpoints/${encodeURIComponent(activeEndpoint.id)}`), {
        method: 'DELETE',
        headers: getDefaultApiHeaders(extraHeaders)
      });
      if (res.ok) {
        const remaining = endpoints.filter(e => e.id !== activeEndpoint.id);
        setEndpoints(remaining);
        saveCachedEndpoints(remaining);
        if (remaining.length > 0) {
          setActiveEndpointId(remaining[0].id);
        }
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

  const scrollToPlayground = () => {
    if (playgroundRef.current) {
      playgroundRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans antialiased selection:bg-amber-100 selection:text-amber-900">
      {/* Top Header */}
      <Header
        endpoints={endpoints}
        activeEndpointId={activeEndpointId}
        onSelectEndpoint={setActiveEndpointId}
        onCreatePlayground={() => handleCreatePlayground()}
        onCreateNamed={() => setNewEndpointModalOpen(true)}
        onOpenPresets={() => setPresetModalOpen(true)}
        onOpenDocs={() => setDocsModalOpen(true)}
        onGoToPlayground={scrollToPlayground}
        loading={loading}
      />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 sm:space-y-16">
        {/* 1. Hero Section (Above Fold) */}
        <HeroSection
          endpoint={activeEndpoint}
          onGetChaosUrl={scrollToConfigurator}
          loading={loading}
        />

        {/* 2. 1-Click Real World Scenarios */}
        <PresetBar
          activeEndpoint={activeEndpoint}
          onApplyPreset={handleApplyPreset}
          onOpenAllPresets={() => setPresetModalOpen(true)}
          loadingPresetId={loadingPresetId}
        />

        {/* 3. How It Works (3 steps) */}
        <HowItWorks />

        {/* 4. Endpoint & Chaos Configurator */}
        <div ref={configuratorRef} className="space-y-6 pt-2">
          {activeEndpoint ? (
            <div className="space-y-6">
              {/* Post-Creation Prominent Summary Card */}
              <PostCreationCard
                endpoint={activeEndpoint}
                onGoToPlayground={scrollToPlayground}
                onGoToConfigurator={scrollToConfigurator}
              />

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
                onUpdateFlakyPercentage={handleUpdateFlakyPercentage}
                onApplyPresetModal={() => setPresetModalOpen(true)}
              />
            </div>
          ) : initError ? (
            <div className="text-center py-10 bg-red-50 rounded-2xl border border-red-200 p-6 space-y-3 font-mono">
              <div className="flex items-center justify-center space-x-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <span className="font-bold text-sm">{initError}</span>
              </div>
              <button
                onClick={() => handleCreatePlayground()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs transition-all shadow-sm inline-flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Sandbox Creation</span>
              </button>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-zinc-200 shadow-2xs font-mono space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-500" />
              <p className="text-zinc-600 text-xs font-semibold">Generating live chaos endpoint...</p>
            </div>
          )}
        </div>

        {/* 5. Live In-Browser Playground Section */}
        <div ref={playgroundRef} className="pt-6 border-t border-zinc-200/80">
          <Playground
            endpoints={endpoints}
            activeEndpointId={activeEndpointId}
            onSelectEndpoint={setActiveEndpointId}
            onRefreshLogs={fetchTelemetry}
          />
        </div>

        {/* 6. Telemetry & Logs (Collapsible/Toggleable) */}
        {activeEndpoint && (
          <div className="pt-6 border-t border-zinc-200/80 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-amber-600" />
                  <span>Telemetry & Raw Request Logs</span>
                </h3>
                <p className="text-sm text-zinc-500 mt-1">
                  Inspect backend server request logs and analytics for /e/{activeEndpoint.slug}.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={scrollToConfigurator}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 transition-colors shadow-2xs"
                  title="Back to Chaos Rules"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-amber-500" />
                  <span>Rules</span>
                </button>

                <button
                  onClick={() => setShowTelemetry(prev => !prev)}
                  className="inline-flex items-center space-x-2 text-xs font-semibold px-4 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800 transition-colors shadow-2xs"
                >
                  <span>{showTelemetry ? 'Hide Telemetry' : 'View Stats & Logs'}</span>
                  {showTelemetry ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
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

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2.5 text-xs animate-in slide-in-from-bottom-3 duration-200 border border-zinc-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <PresetModal
        isOpen={presetModalOpen}
        onClose={() => setPresetModalOpen(false)}
        onApplyPreset={handleApplyPreset}
        activeEndpoint={activeEndpoint}
      />

      <NewEndpointModal
        isOpen={newEndpointModalOpen}
        onClose={() => setNewEndpointModalOpen(false)}
        onCreateEndpoint={handleCreateNamedEndpoint}
        existingEndpoints={endpoints}
      />

      <DocsModal
        isOpen={docsModalOpen}
        onClose={() => setDocsModalOpen(false)}
      />
    </div>
  );
}
