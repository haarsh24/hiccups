import React, { useState, useEffect } from 'react';
import {
  Clock,
  AlertTriangle,
  Unplug,
  Hourglass,
  ShieldAlert,
  Gauge,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ChaosEndpoint, ChaosRule, BehaviorType } from '../types';

interface NumericInputProps {
  value: number | undefined;
  defaultValue?: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
}

const NumericInput: React.FC<NumericInputProps> = ({
  value,
  defaultValue = 0,
  min = 0,
  max = 60000,
  onChange,
  className = '',
  placeholder
}) => {
  const currentVal = value ?? defaultValue;
  const [localVal, setLocalVal] = useState<string>(String(currentVal));

  useEffect(() => {
    setLocalVal(String(value ?? defaultValue));
  }, [value, defaultValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalVal(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
    }
  };

  const handleBlur = () => {
    const parsed = parseInt(localVal, 10);
    if (isNaN(parsed) || localVal.trim() === '') {
      setLocalVal(String(defaultValue));
      onChange(defaultValue);
    } else {
      const clamped = Math.max(min, Math.min(max, parsed));
      setLocalVal(String(clamped));
      onChange(clamped);
    }
  };

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
    />
  );
};

interface ChaosConfiguratorProps {
  endpoint: ChaosEndpoint;
  onUpdateRule: (ruleId: string, updated: Partial<ChaosRule>) => void;
  onUpdateFlakyPercentage: (val: number) => void;
  onApplyPresetModal: () => void;
}

export const ChaosConfigurator: React.FC<ChaosConfiguratorProps> = ({
  endpoint,
  onUpdateRule,
  onUpdateFlakyPercentage,
  onApplyPresetModal
}) => {
  const getRule = (type: BehaviorType): ChaosRule | undefined => {
    return endpoint.rules.find(r => r.type === type);
  };

  const updateRuleParams = (rule: ChaosRule, paramKey: string, newParamObj: Record<string, unknown>) => {
    onUpdateRule(rule.id, {
      params: {
        ...rule.params,
        [paramKey]: {
          ...(rule.params as Record<string, Record<string, unknown>>)[paramKey],
          ...newParamObj
        }
      }
    });
  };

  const latencyRule = getRule('latency');
  const errorRule = getRule('error');
  const dropRule = getRule('drop');
  const hangRule = getRule('hang');
  const rateLimitRule = getRule('rate_limit');
  const dripRule = getRule('drip');

  const [isExpanded, setIsExpanded] = useState(true);
  const activeCount = endpoint.rules.filter(r => r.enabled).length;

  return (
    <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* Panel Header & Master Chaos Rate */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80">
        <div>
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-zinc-900 font-sans">
              Chaos Rules & Behavior Profile
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
              {activeCount} active {activeCount === 1 ? 'rule' : 'rules'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Endpoint: <span className="text-zinc-800 font-semibold">/e/{endpoint?.slug || ''}</span>
          </p>
        </div>

        {/* Master Chaos Slider & Accordion Toggle */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-3 bg-zinc-50 border border-zinc-200/80 rounded-xl px-3.5 py-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs space-x-2">
                <span className="text-zinc-600 font-medium">Chaos Rate</span>
                <span className="font-mono font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[11px]">
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
                className="w-28 sm:w-36 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
            </div>

            <button
              onClick={onApplyPresetModal}
              className="text-xs font-semibold text-zinc-700 hover:text-zinc-900 bg-white border border-zinc-200 hover:bg-zinc-100 px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs whitespace-nowrap"
            >
              Presets
            </button>
          </div>

          <button
            onClick={() => setIsExpanded(prev => !prev)}
            className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition-colors flex items-center space-x-1 text-xs font-mono"
            title={isExpanded ? 'Collapse rules configuration' : 'Expand rules configuration'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded ? (
        /* Unified Misbehavior Rows Container */
        <div className="divide-y divide-zinc-200/70 space-y-0 font-mono text-xs">
        
        {/* Row 1: Latency Injection */}
        {latencyRule && (
          <div className="py-4 first:pt-0 last:pb-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className={`p-1.5 rounded-lg ${latencyRule.enabled ? 'bg-amber-500/10 text-amber-600' : 'bg-zinc-100 text-zinc-400'}`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 font-sans text-xs">Latency & Delay Jitter</h3>
                  <p className="text-[11px] text-zinc-500 font-mono">Inject response delays before returning HTTP payloads</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={latencyRule.enabled}
                  onChange={(e) => onUpdateRule(latencyRule.id, { enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {latencyRule.enabled && (
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-zinc-600 mb-1">
                      <span>Probability</span>
                      <span className="font-bold text-zinc-900">{Math.round(latencyRule.probability * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={latencyRule.probability}
                      onChange={(e) => onUpdateRule(latencyRule.id, { probability: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-200 rounded appearance-none cursor-pointer accent-amber-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-zinc-500 text-[10px] uppercase mb-1">Min (ms)</label>
                      <NumericInput
                        value={latencyRule.params.latency?.minMs}
                        defaultValue={500}
                        min={0}
                        max={60000}
                        onChange={(val) => updateRuleParams(latencyRule, 'latency', { minMs: val })}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 text-[10px] uppercase mb-1">Max (ms)</label>
                      <NumericInput
                        value={latencyRule.params.latency?.maxMs}
                        defaultValue={2500}
                        min={0}
                        max={60000}
                        onChange={(val) => updateRuleParams(latencyRule, 'latency', { maxMs: val })}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Row 2: HTTP Error Code */}
        {errorRule && (
          <div className="py-4 first:pt-0 last:pb-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className={`p-1.5 rounded-lg ${errorRule.enabled ? 'bg-red-500/10 text-red-600' : 'bg-zinc-100 text-zinc-400'}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 font-sans text-xs">HTTP Server Fault Codes</h3>
                  <p className="text-[11px] text-zinc-500 font-mono">Return 5xx server errors or 4xx client status codes</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={errorRule.enabled}
                  onChange={(e) => onUpdateRule(errorRule.id, { enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {errorRule.enabled && (
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-zinc-600 mb-1">
                      <span>Probability</span>
                      <span className="font-bold text-zinc-900">{Math.round(errorRule.probability * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={errorRule.probability}
                      onChange={(e) => onUpdateRule(errorRule.id, { probability: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-200 rounded appearance-none cursor-pointer accent-amber-600"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-500 text-[10px] uppercase mb-1">Status Code</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[500, 502, 503, 504, 429, 400, 401].map(code => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => updateRuleParams(errorRule, 'error', { statusCode: code })}
                          className={`px-2.5 py-1 rounded-md transition-all text-xs font-semibold ${
                            errorRule.params.error?.statusCode === code
                              ? 'bg-zinc-900 text-white shadow-2xs'
                              : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
                          }`}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Row 3: Connection Drops */}
        {dropRule && (
          <div className="py-4 first:pt-0 last:pb-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className={`p-1.5 rounded-lg ${dropRule.enabled ? 'bg-purple-500/10 text-purple-600' : 'bg-zinc-100 text-zinc-400'}`}>
                  <Unplug className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 font-sans text-xs">Abrupt TCP Reset (ECONNRESET)</h3>
                  <p className="text-[11px] text-zinc-500 font-mono">Destroy underlying TCP sockets without HTTP status framing</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={dropRule.enabled}
                  onChange={(e) => onUpdateRule(dropRule.id, { enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {dropRule.enabled && (
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-zinc-600 mb-1">
                      <span>Probability</span>
                      <span className="font-bold text-zinc-900">{Math.round(dropRule.probability * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={dropRule.probability}
                      onChange={(e) => onUpdateRule(dropRule.id, { probability: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-200 rounded appearance-none cursor-pointer accent-amber-600"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-3">
                    <button
                      type="button"
                      onClick={() => updateRuleParams(dropRule, 'drop', { mode: 'abrupt' })}
                      className={`flex-1 py-1.5 px-3 rounded-lg border text-center text-xs transition-all ${
                        dropRule.params.drop?.mode === 'abrupt'
                          ? 'bg-zinc-900 border-zinc-900 text-white font-semibold'
                          : 'bg-white border-zinc-200 text-zinc-600'
                      }`}
                    >
                      Abrupt Socket Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRuleParams(dropRule, 'drop', { mode: 'partial' })}
                      className={`flex-1 py-1.5 px-3 rounded-lg border text-center text-xs transition-all ${
                        dropRule.params.drop?.mode === 'partial'
                          ? 'bg-zinc-900 border-zinc-900 text-white font-semibold'
                          : 'bg-white border-zinc-200 text-zinc-600'
                      }`}
                    >
                      Partial Byte Cut
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Row 4: Connection Hang */}
        {hangRule && (
          <div className="py-4 first:pt-0 last:pb-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className={`p-1.5 rounded-lg ${hangRule.enabled ? 'bg-blue-500/10 text-blue-600' : 'bg-zinc-100 text-zinc-400'}`}>
                  <Hourglass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 font-sans text-xs">Silent Socket Hold / Hang</h3>
                  <p className="text-[11px] text-zinc-500 font-mono">Hold connection open indefinitely to test client read timeouts</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hangRule.enabled}
                  onChange={(e) => onUpdateRule(hangRule.id, { enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {hangRule.enabled && (
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between text-zinc-600 mb-1">
                  <span>Socket Hold Duration</span>
                  <span className="font-bold text-zinc-900">{hangRule.params.hang?.durationSeconds || 30} seconds</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={hangRule.params.hang?.durationSeconds || 30}
                  onChange={(e) => updateRuleParams(hangRule, 'hang', { durationSeconds: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-zinc-200 rounded appearance-none cursor-pointer accent-amber-600"
                />
              </div>
            )}
          </div>
        )}

        {/* Row 5: Rate Limiting */}
        {rateLimitRule && (
          <div className="py-4 first:pt-0 last:pb-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className={`p-1.5 rounded-lg ${rateLimitRule.enabled ? 'bg-cyan-500/10 text-cyan-600' : 'bg-zinc-100 text-zinc-400'}`}>
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 font-sans text-xs">Rate Limiting (HTTP 429)</h3>
                  <p className="text-[11px] text-zinc-500 font-mono">Enforce sliding window rate limits with Retry-After headers</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rateLimitRule.enabled}
                  onChange={(e) => onUpdateRule(rateLimitRule.id, { enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {rateLimitRule.enabled && (
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 text-[10px] uppercase mb-1">Max Req/Min</label>
                  <NumericInput
                    value={rateLimitRule.params.rateLimit?.maxRequestsPerMin}
                    defaultValue={10}
                    min={1}
                    max={1000}
                    onChange={(val) => updateRuleParams(rateLimitRule, 'rateLimit', { maxRequestsPerMin: val })}
                    className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 text-[10px] uppercase mb-1">Retry-After (sec)</label>
                  <NumericInput
                    value={rateLimitRule.params.rateLimit?.retryAfterSeconds}
                    defaultValue={15}
                    min={1}
                    max={3600}
                    onChange={(val) => updateRuleParams(rateLimitRule, 'rateLimit', { retryAfterSeconds: val })}
                    className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Row 6: Slow Drip Stream */}
        {dripRule && (
          <div className="py-4 first:pt-0 last:pb-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className={`p-1.5 rounded-lg ${dripRule.enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}>
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 font-sans text-xs">Slow Drip Response Stream</h3>
                  <p className="text-[11px] text-zinc-500 font-mono">Stream body byte-by-byte with artificial inter-chunk latency</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={dripRule.enabled}
                  onChange={(e) => onUpdateRule(dripRule.id, { enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {dripRule.enabled && (
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 text-[10px] uppercase mb-1">Bytes / Chunk</label>
                  <NumericInput
                    value={dripRule.params.drip?.chunkSizeBytes}
                    defaultValue={16}
                    min={1}
                    max={8192}
                    onChange={(val) => updateRuleParams(dripRule, 'drip', { chunkSizeBytes: val })}
                    className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 text-[10px] uppercase mb-1">Delay (ms)</label>
                  <NumericInput
                    value={dripRule.params.drip?.delayMsPerChunk}
                    defaultValue={200}
                    min={10}
                    max={10000}
                    onChange={(val) => updateRuleParams(dripRule, 'drip', { delayMsPerChunk: val })}
                    className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

      </div>
      ) : (
        <div className="text-center py-3 bg-zinc-50 rounded-xl border border-zinc-200/80 font-mono text-xs text-zinc-500 flex items-center justify-center space-x-2">
          <span>Rules panel collapsed ({activeCount} active).</span>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-amber-600 hover:text-amber-700 font-semibold underline"
          >
            Show knobs & sliders
          </button>
        </div>
      )}
    </div>
  );
};
