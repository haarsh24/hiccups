import React, { useState } from 'react';
import { Copy, Check, Play, Settings, Key, Zap, Shield, Sparkles } from 'lucide-react';
import { ChaosEndpoint } from '../types';
import { getEndpointOrigin } from '../lib/config';

interface PostCreationCardProps {
  endpoint: ChaosEndpoint;
  onGoToPlayground: () => void;
  onGoToConfigurator: () => void;
}

export const PostCreationCard: React.FC<PostCreationCardProps> = ({
  endpoint,
  onGoToPlayground,
  onGoToConfigurator
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const origin = getEndpointOrigin();
  const fullUrl = `${origin}/e/${endpoint.slug}`;
  const managementToken = endpoint.managementToken;

  const copyUrl = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const copyToken = () => {
    if (managementToken) {
      navigator.clipboard.writeText(managementToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  // Human-readable active rules summary
  const activeRules = endpoint.rules.filter(r => r.enabled);
  
  const ruleDescriptions: string[] = [];
  
  if (endpoint.flakyPercentage === 0) {
    ruleDescriptions.push("0% chaos rate — endpoint behaves cleanly (100% success)");
  } else {
    ruleDescriptions.push(`⚡ Master Chaos Rate: ${endpoint.flakyPercentage}% of incoming requests will trigger active fault rules`);
  }

  activeRules.forEach(r => {
    const probPct = Math.round(r.probability * 100);
    if (r.type === 'latency' && r.params.latency) {
      ruleDescriptions.push(`⏱️ Latency (${probPct}% chance): ${r.params.latency.minMs}-${r.params.latency.maxMs}ms delay${r.params.latency.jitter ? ' with jitter' : ''}`);
    } else if (r.type === 'error' && r.params.error) {
      ruleDescriptions.push(`💥 HTTP Error (${probPct}% chance): Returns HTTP ${r.params.error.statusCode} error response`);
    } else if (r.type === 'drop' && r.params.drop) {
      ruleDescriptions.push(`🔌 TCP Reset (${probPct}% chance): ${r.params.drop.mode === 'abrupt' ? 'Abrupt TCP socket destruction (ECONNRESET)' : `Partial stream drop after ${r.params.drop.bytesBeforeDrop || 64} bytes`}`);
    } else if (r.type === 'hang' && r.params.hang) {
      ruleDescriptions.push(`⏳ Silent Hang (${probPct}% chance): Holds socket open for ${r.params.hang.durationSeconds}s`);
    } else if (r.type === 'rate_limit' && r.params.rateLimit) {
      ruleDescriptions.push(`🚧 Rate Limit (${probPct}% chance): Max ${r.params.rateLimit.maxRequestsPerMin} req/min, 429 status with Retry-After`);
    } else if (r.type === 'drip' && r.params.drip) {
      ruleDescriptions.push(`💧 Slow Drip (${probPct}% chance): ${r.params.drip.chunkSizeBytes}b chunks every ${r.params.drip.delayMsPerChunk}ms`);
    } else if (r.type === 'malformed') {
      ruleDescriptions.push(`🧩 Malformed JSON (${probPct}% chance): Returns truncated invalid JSON syntax`);
    } else if (r.type === 'redirect_loop' && r.params.redirect) {
      ruleDescriptions.push(`🔄 Redirect Loop (${probPct}% chance): HTTP 302 redirect loop`);
    }
  });

  return (
    <div className="bg-gradient-to-b from-amber-500/5 to-zinc-900/5 border border-amber-500/20 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
      {/* Header Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 pb-4">
        <div className="flex items-center space-x-2">
          <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-base text-zinc-900">{endpoint.name}</h3>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-zinc-900 text-amber-400">
                /e/{endpoint.slug}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {endpoint.expiresAt
                ? `24-Hour Sandbox Endpoint • Expires ${new Date(endpoint.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Persistent Custom Endpoint'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onGoToPlayground}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center space-x-1.5 active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Test in Playground</span>
          </button>

          <button
            onClick={onGoToConfigurator}
            className="px-3.5 py-2 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-semibold rounded-xl text-xs transition-all shadow-2xs flex items-center space-x-1.5"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-500" />
            <span>Configure Rules</span>
          </button>
        </div>
      </div>

      {/* Prominent Generated URL Box */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-700 flex items-center space-x-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Live Endpoint URL</span>
        </label>
        <div className="flex items-center bg-white border border-zinc-300 rounded-xl p-2 shadow-2xs group focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500">
          <code className="text-xs sm:text-sm font-mono text-zinc-900 px-2 truncate flex-1 font-semibold">
            {fullUrl}
          </code>
          <button
            onClick={copyUrl}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 ${
              copiedUrl
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            {copiedUrl ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy URL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Chaos Rules Summary */}
      <div className="bg-white/80 border border-zinc-200 rounded-xl p-4 space-y-2">
        <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider font-mono flex items-center space-x-1.5">
          <Shield className="w-3.5 h-3.5 text-zinc-500" />
          <span>Active Chaos Rules ({activeRules.length} Enabled)</span>
        </h4>
        <ul className="space-y-1 text-xs text-zinc-600 font-mono">
          {ruleDescriptions.map((desc, idx) => (
            <li key={idx} className="flex items-start space-x-2">
              <span className="text-amber-500 shrink-0">•</span>
              <span>{desc}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Management Token Notification (if persistent / named endpoint) */}
      {managementToken && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-zinc-800">
            <Key className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Management Token:</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-amber-500/30 font-mono font-semibold text-zinc-900">{managementToken}</code> — Save this token to edit or delete this endpoint later.
            </span>
          </div>
          <button
            onClick={copyToken}
            className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-amber-500/30 text-amber-900 font-semibold rounded-lg text-[11px] transition-colors shrink-0 flex items-center space-x-1"
          >
            {copiedToken ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-amber-700" />}
            <span>{copiedToken ? 'Token Copied!' : 'Copy Token'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
