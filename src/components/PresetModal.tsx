import React from 'react';
import { Sparkles, X, CreditCard, Unplug, ShieldAlert, Gauge, Clock, FileCode2, RefreshCw } from 'lucide-react';
import { PRESET_PROFILES } from '../data/presets';
import { PresetProfile } from '../types';

interface PresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset: (presetId: string) => void;
}

export const PresetModal: React.FC<PresetModalProps> = ({
  isOpen,
  onClose,
  onApplyPreset
}) => {
  if (!isOpen) return null;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'CreditCard': return <CreditCard className="w-4 h-4 text-zinc-300" />;
      case 'Unplug': return <Unplug className="w-4 h-4 text-zinc-300" />;
      case 'ShieldAlert': return <ShieldAlert className="w-4 h-4 text-zinc-300" />;
      case 'Gauge': return <Gauge className="w-4 h-4 text-zinc-300" />;
      case 'Clock': return <Clock className="w-4 h-4 text-zinc-300" />;
      case 'FileCode2': return <FileCode2 className="w-4 h-4 text-zinc-300" />;
      case 'RefreshCw': return <RefreshCw className="w-4 h-4 text-zinc-300" />;
      default: return <Sparkles className="w-4 h-4 text-zinc-300" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl max-w-xl w-full p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col font-mono text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-zinc-300" />
            <h3 className="font-semibold text-xs text-white">Preset Scenarios</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-zinc-400">
          Load a pre-configured network profile to test resilience handlers instantly.
        </p>

        {/* Preset Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto pr-1 flex-1">
          {PRESET_PROFILES.map((preset: PresetProfile) => (
            <div
              key={preset.id}
              onClick={() => {
                onApplyPreset(preset.id);
                onClose();
              }}
              className="bg-black hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-600 rounded-lg p-3 cursor-pointer transition-all space-y-2 group flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="p-1 rounded bg-zinc-900 border border-zinc-800">
                    {getIcon(preset.iconName)}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                    {preset.flakyPercentage}% chaos
                  </span>
                </div>

                <div>
                  <h4 className="font-semibold text-xs text-zinc-200 group-hover:text-white transition-colors">
                    {preset.name}
                  </h4>
                  <p className="text-[10px] text-zinc-500">
                    {preset.tagline}
                  </p>
                </div>

                <p className="text-[11px] text-zinc-400 leading-snug">
                  {preset.description}
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-900 text-[10px] text-zinc-400 group-hover:text-white transition-colors flex items-center justify-between">
                <span>Apply</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

