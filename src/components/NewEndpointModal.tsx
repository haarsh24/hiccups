import React, { useState, useEffect } from 'react';
import { X, Plus, Layers, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { PRESET_PROFILES } from '../data/presets';
import { ChaosEndpoint } from '../types';
import { getApiUrl, getDefaultApiHeaders } from '../lib/config';

interface NewEndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateEndpoint: (name: string, customSlug?: string, presetId?: string) => void;
  existingEndpoints?: ChaosEndpoint[];
}

export const NewEndpointModal: React.FC<NewEndpointModalProps> = ({
  isOpen,
  onClose,
  onCreateEndpoint,
  existingEndpoints = []
}) => {
  const [name, setName] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  
  const [slugStatus, setSlugStatus] = useState<{
    checking: boolean;
    valid: boolean | null;
    message: string | null;
  }>({ checking: false, valid: null, message: null });

  useEffect(() => {
    if (!customSlug.trim()) {
      setSlugStatus({ checking: false, valid: null, message: null });
      return;
    }

    const slugToTest = customSlug.trim().toLowerCase();

    if (!/^[a-z0-9-]+$/.test(slugToTest)) {
      setSlugStatus({
        checking: false,
        valid: false,
        message: 'Only lowercase letters, numbers, and hyphens allowed.'
      });
      return;
    }

    // Check client-side first
    const clientExists = existingEndpoints.some(e => e.slug === slugToTest);
    if (clientExists) {
      setSlugStatus({
        checking: false,
        valid: false,
        message: `Slug '/e/${slugToTest}' is already taken.`
      });
      return;
    }

    // Check server
    setSlugStatus({ checking: true, valid: null, message: 'Checking availability...' });
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(getApiUrl(`/api/v1/check-slug?slug=${encodeURIComponent(slugToTest)}`), {
          headers: getDefaultApiHeaders()
        });
        const data = await res.json();
        if (data.taken) {
          setSlugStatus({
            checking: false,
            valid: false,
            message: `Slug '/e/${slugToTest}' is already taken.`
          });
        } else if (data.available) {
          setSlugStatus({
            checking: false,
            valid: true,
            message: `Slug '/e/${slugToTest}' is available!`
          });
        } else {
          setSlugStatus({ checking: false, valid: true, message: null });
        }
      } catch {
        setSlugStatus({ checking: false, valid: true, message: null });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customSlug, existingEndpoints]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (customSlug.trim() && slugStatus.valid === false) return;

    onCreateEndpoint(name.trim(), customSlug.trim() || undefined, selectedPresetId || undefined);
    setName('');
    setCustomSlug('');
    setSelectedPresetId('');
    setSlugStatus({ checking: false, valid: null, message: null });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-mono text-xs">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-zinc-300" />
            <h3 className="font-semibold text-xs text-white">Create Custom Endpoint</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-zinc-400 text-[11px] mb-1">Endpoint Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Stripe Webhook Sandbox"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-amber-500 text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-zinc-400 text-[11px]">Custom Slug (Optional)</label>
              {slugStatus.checking && (
                <span className="text-[10px] text-zinc-500 flex items-center space-x-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Checking...</span>
                </span>
              )}
            </div>
            <div className={`flex items-center bg-black border rounded px-2.5 py-1.5 text-xs text-zinc-400 ${
              slugStatus.valid === false ? 'border-red-500/80' : slugStatus.valid === true ? 'border-emerald-500/80' : 'border-zinc-800'
            }`}>
              <span className="text-zinc-600 shrink-0">/e/</span>
              <input
                type="text"
                placeholder="stripe-flaky"
                value={customSlug}
                onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="w-full bg-transparent text-white focus:outline-none ml-0.5"
              />
            </div>
            {slugStatus.message && (
              <div className={`mt-1 text-[10px] flex items-center space-x-1 ${
                slugStatus.valid === false ? 'text-red-400' : slugStatus.valid === true ? 'text-emerald-400' : 'text-zinc-400'
              }`}>
                {slugStatus.valid === false ? <AlertCircle className="w-3 h-3 shrink-0" /> : <CheckCircle2 className="w-3 h-3 shrink-0" />}
                <span>{slugStatus.message}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] mb-1">Initial Preset Scenario</label>
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-amber-500 text-xs"
            >
              <option value="">Default Flaky Rules (50% Chaos)</option>
              {PRESET_PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.flakyPercentage}% chaos)
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 border-t border-zinc-900 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-black hover:bg-zinc-900 text-zinc-400 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={slugStatus.valid === false || !name.trim()}
              className="px-3.5 py-1.5 bg-white hover:bg-zinc-200 text-black font-semibold rounded transition-colors flex items-center space-x-1 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Custom Slug</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
