import React, { useState } from 'react';
import { CreditCard, Unplug, ShieldAlert, Gauge, Clock, FileCode2, Sparkles, Check, RotateCw, ArrowRight } from 'lucide-react';
import { PRESET_PROFILES } from '../data/presets';
import { ChaosEndpoint } from '../types';

interface PresetBarProps {
  activeEndpoint?: ChaosEndpoint | null;
  onApplyPreset: (presetId: string) => Promise<void> | void;
  onOpenAllPresets: () => void;
  loadingPresetId?: string | null;
}

export const PresetBar: React.FC<PresetBarProps> = ({
  activeEndpoint,
  onApplyPreset,
  onOpenAllPresets,
  loadingPresetId
}) => {
  const [internalLoadingId, setInternalLoadingId] = useState<string | null>(null);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'CreditCard': return <CreditCard className="w-4 h-4 text-amber-500" />;
      case 'Unplug': return <Unplug className="w-4 h-4 text-purple-500" />;
      case 'ShieldAlert': return <ShieldAlert className="w-4 h-4 text-cyan-500" />;
      case 'Gauge': return <Gauge className="w-4 h-4 text-blue-500" />;
      case 'Clock': return <Clock className="w-4 h-4 text-emerald-500" />;
      case 'FileCode2': return <FileCode2 className="w-4 h-4 text-rose-500" />;
      default: return <Sparkles className="w-4 h-4 text-amber-500" />;
    }
  };

  const handleClick = async (presetId: string) => {
    setInternalLoadingId(presetId);
    try {
      await onApplyPreset(presetId);
    } finally {
      setInternalLoadingId(null);
    }
  };

  // Top 4 popular scenarios
  const topPresets = PRESET_PROFILES.slice(0, 4);

  // Check if current endpoint rules match preset
  const isPresetActive = (presetId: string) => {
    if (!activeEndpoint) return false;
    const preset = PRESET_PROFILES.find(p => p.id === presetId);
    if (!preset) return false;
    return activeEndpoint.flakyPercentage === preset.flakyPercentage;
  };

  const activeLoading = loadingPresetId || internalLoadingId;

  return (
    <section className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm space-y-4 font-mono text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h2 className="font-bold text-sm text-zinc-900 font-sans">
            1-Click Real World Scenarios
          </h2>
          <span className="text-[11px] text-zinc-500 font-mono hidden md:inline">
            • Apply instant battle-tested failure profiles
          </span>
        </div>

        <button
          onClick={onOpenAllPresets}
          className="text-xs text-amber-700 hover:text-amber-800 font-semibold transition-colors flex items-center space-x-1"
        >
          <span>View all {PRESET_PROFILES.length} scenarios</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {topPresets.map((preset) => {
          const isLoading = activeLoading === preset.id;
          const isActive = isPresetActive(preset.id);

          return (
            <button
              key={preset.id}
              onClick={() => handleClick(preset.id)}
              disabled={Boolean(activeLoading)}
              className={`text-left border rounded-xl p-3.5 transition-all shadow-2xs group flex flex-col justify-between space-y-3 active:scale-[0.98] ${
                isActive
                  ? 'bg-amber-50/70 border-amber-400/80 shadow-xs'
                  : 'bg-zinc-50 hover:bg-amber-500/[0.04] border-zinc-200/90 hover:border-amber-400/60'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="p-1.5 rounded-lg bg-white border border-zinc-200 shadow-2xs">
                    {getIcon(preset.iconName)}
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {isActive && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center space-x-0.5">
                        <Check className="w-2.5 h-2.5" />
                        <span>Active</span>
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-200/80 text-zinc-700">
                      {preset.flakyPercentage}% chaos
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-xs text-zinc-900 font-sans group-hover:text-amber-700 transition-colors">
                    {preset.name}
                  </h3>
                  <p className="text-[11px] text-zinc-500 leading-tight line-clamp-2 mt-0.5">
                    {preset.tagline}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-200/60 text-[11px] text-zinc-600 group-hover:text-amber-800 font-semibold flex items-center justify-between">
                <span>{isLoading ? 'Applying...' : isActive ? 'Re-apply Scenario' : 'Apply Scenario'}</span>
                {isLoading ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
