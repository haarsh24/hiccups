import React, { useState, useEffect } from 'react';
import { Copy, Check, Clock, Trash2, RotateCcw, ExternalLink, Sliders } from 'lucide-react';
import { ChaosEndpoint } from '../types';
import { getEndpointOrigin } from '../lib/config';

interface EndpointHeaderProps {
  endpoint: ChaosEndpoint;
  onUpdateFlakyPercentage: (val: number) => void;
  onApplyPresetModal: () => void;
  onResetStats: () => void;
  onDeleteEndpoint: () => void;
}

export const EndpointHeader: React.FC<EndpointHeaderProps> = ({
  endpoint,
  onUpdateFlakyPercentage,
  onApplyPresetModal,
  onResetStats,
  onDeleteEndpoint
}) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  const origin = getEndpointOrigin();
  const fullEndpointUrl = endpoint?.slug ? `${origin}/e/${endpoint.slug}` : '';

  useEffect(() => {
    if (!endpoint?.expiresAt) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const expire = new Date(endpoint.expiresAt!).getTime();
      const diff = expire - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}h ${mins}m left`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [endpoint.expiresAt]);

  const copyUrl = () => {
    navigator.clipboard.writeText(fullEndpointUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 sm:p-5 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: Endpoint Title & URL */}
        <div className="space-y-2.5 flex-1 min-w-0">
          <div className="flex items-center space-x-2.5 flex-wrap">
            <h1 className="text-lg font-semibold text-white tracking-tight font-sans">
              {endpoint.name}
            </h1>
            
            {endpoint.isAnonymous ? (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                <Clock className="w-3 h-3" />
                <span>{timeLeft || '24h TTL'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span>Persistent</span>
              </span>
            )}
          </div>

          {/* Clean URL Box */}
          <div className="flex items-center space-x-2 bg-black border border-zinc-800/90 rounded-md p-1.5 sm:px-3 sm:py-1.5 max-w-2xl">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-1.5 py-0.5 bg-zinc-900 rounded border border-zinc-800">
              ANY
            </span>
            <input
              type="text"
              readOnly
              value={fullEndpointUrl}
              className="bg-transparent font-mono text-xs text-zinc-300 focus:outline-none flex-1 truncate selection:bg-zinc-800"
            />
            <button
              onClick={copyUrl}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors flex items-center space-x-1 shrink-0 ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-zinc-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <a
              href={fullEndpointUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1 text-zinc-400 hover:text-white transition-colors hidden sm:block"
              title="Open Endpoint"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Right: Master Chaos Slider & Compact Actions */}
        <div className="w-full lg:w-72 bg-zinc-900/50 border border-zinc-800/70 rounded-lg p-3.5 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-zinc-400 font-mono text-[11px] flex items-center space-x-1.5">
                <Sliders className="w-3 h-3 text-zinc-400" />
                <span>Chaos Rate</span>
              </span>
              <span className="font-mono font-semibold px-2 py-0.5 rounded text-xs bg-zinc-900 text-white border border-zinc-800">
                {endpoint.flakyPercentage}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={endpoint.flakyPercentage}
              onChange={(e) => onUpdateFlakyPercentage(parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs">
            <button
              onClick={onApplyPresetModal}
              className="text-zinc-300 hover:text-white font-mono text-[11px] transition-colors"
            >
              Apply Preset
            </button>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={onResetStats}
                className="text-zinc-400 hover:text-zinc-200 p-1 hover:bg-zinc-800 rounded transition-colors"
                title="Reset Logs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              {!endpoint.isDemo && (
                <button
                  onClick={onDeleteEndpoint}
                  className="text-zinc-400 hover:text-red-400 p-1 hover:bg-zinc-800 rounded transition-colors"
                  title="Delete Endpoint"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

