import React from 'react';
import { BarChart3, AlertTriangle, Clock, Zap } from 'lucide-react';
import { EndpointStats } from '../types';

interface StatsOverviewProps {
  stats: EndpointStats | null;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  if (!stats) return null;

  const total = stats.totalRequests || 0;
  const faultRate = total > 0 ? Math.round((stats.faultRequests / total) * 100) : 0;
  const successRate = total > 0 ? Math.round((stats.successRequests / total) * 100) : 100;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
      {/* Total Requests */}
      <div className="bg-white border border-zinc-200/80 rounded-xl p-3.5 space-y-1 shadow-2xs">
        <div className="flex items-center justify-between text-zinc-500 text-[10px] uppercase font-bold">
          <span>Total Requests</span>
          <BarChart3 className="w-3.5 h-3.5 text-zinc-400" />
        </div>
        <div className="text-2xl font-extrabold text-zinc-900">{total}</div>
        <div className="text-[10px] text-zinc-400">Captured probes</div>
      </div>

      {/* Fault Rate */}
      <div className="bg-white border border-zinc-200/80 rounded-xl p-3.5 space-y-1 shadow-2xs">
        <div className="flex items-center justify-between text-zinc-500 text-[10px] uppercase font-bold">
          <span>Chaos Rate</span>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-2xl font-extrabold text-amber-600">{faultRate}%</span>
          <span className="text-[10px] text-zinc-400">({stats.faultRequests} faults)</span>
        </div>
        <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden flex mt-1.5">
          <div className="bg-amber-500 h-full" style={{ width: `${faultRate}%` }} />
          <div className="bg-zinc-300 h-full" style={{ width: `${successRate}%` }} />
        </div>
      </div>

      {/* Latencies */}
      <div className="bg-white border border-zinc-200/80 rounded-xl p-3.5 space-y-1 shadow-2xs">
        <div className="flex items-center justify-between text-zinc-500 text-[10px] uppercase font-bold">
          <span>Latency (P50/P90/P95)</span>
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
        </div>
        <div className="grid grid-cols-3 gap-1 text-center pt-1">
          <div>
            <div className="text-[9px] text-zinc-400">P50</div>
            <div className="text-xs font-bold text-zinc-800">{stats.p50Latency}ms</div>
          </div>
          <div>
            <div className="text-[9px] text-zinc-400">P90</div>
            <div className="text-xs font-bold text-zinc-800">{stats.p90Latency}ms</div>
          </div>
          <div>
            <div className="text-[9px] text-zinc-400">P95</div>
            <div className="text-xs font-bold text-zinc-800">{stats.p95Latency}ms</div>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-white border border-zinc-200/80 rounded-xl p-3.5 space-y-1 shadow-2xs">
        <div className="flex items-center justify-between text-zinc-500 text-[10px] uppercase font-bold">
          <span>Response Ratio</span>
          <Zap className="w-3.5 h-3.5 text-zinc-400" />
        </div>
        <div className="flex items-center justify-between text-xs pt-2">
          <span className="text-emerald-700 font-semibold">Clean: {stats.successRequests}</span>
          <span className="text-amber-700 font-semibold">Faults: {stats.faultRequests}</span>
        </div>
      </div>
    </div>
  );
};
