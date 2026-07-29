import React, { useState } from 'react';
import { X, Plus, Layers } from 'lucide-react';
import { PRESET_PROFILES } from '../data/presets';

interface NewEndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateEndpoint: (name: string, customSlug?: string, presetId?: string) => void;
}

export const NewEndpointModal: React.FC<NewEndpointModalProps> = ({
  isOpen,
  onClose,
  onCreateEndpoint
}) => {
  const [name, setName] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateEndpoint(name.trim(), customSlug.trim() || undefined, selectedPresetId || undefined);
    setName('');
    setCustomSlug('');
    setSelectedPresetId('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-mono text-xs">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-zinc-300" />
            <h3 className="font-semibold text-xs text-white">Create Endpoint</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-zinc-400 text-[11px] mb-1">Endpoint Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Stripe Webhook Sandbox"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-600 text-xs"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] mb-1">Custom Slug (Optional)</label>
            <div className="flex items-center bg-black border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-400">
              <span className="text-zinc-600 shrink-0">/e/</span>
              <input
                type="text"
                placeholder="stripe-flaky"
                value={customSlug}
                onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="w-full bg-transparent text-white focus:outline-none ml-0.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] mb-1">Initial Preset</label>
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-600 text-xs"
            >
              <option value="">Default Flaky Rules</option>
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
              className="px-3 py-1 bg-black hover:bg-zinc-900 text-zinc-400 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-white hover:bg-zinc-200 text-black font-semibold rounded transition-colors flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

