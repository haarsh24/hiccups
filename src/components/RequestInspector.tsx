import React, { useState } from 'react';
import { Activity, RefreshCw, Trash2, Search, Eye, X } from 'lucide-react';
import { RequestLog } from '../types';

interface RequestInspectorProps {
  logs: RequestLog[];
  onRefresh: () => void;
  onClearLogs: () => void;
  loading: boolean;
}

export const RequestInspector: React.FC<RequestInspectorProps> = ({
  logs,
  onRefresh,
  onClearLogs,
  loading
}) => {
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);
  const [filterText, setFilterText] = useState('');

  const filteredLogs = logs.filter(l =>
    l.method.toLowerCase().includes(filterText.toLowerCase()) ||
    l.path.toLowerCase().includes(filterText.toLowerCase()) ||
    l.behaviorApplied.toLowerCase().includes(filterText.toLowerCase()) ||
    String(l.httpStatusReturned).includes(filterText)
  );

  const getBehaviorBadge = (behavior: string) => {
    switch (behavior) {
      case 'none_clean':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-100 text-zinc-600 border border-zinc-200">clean</span>;
      case 'latency':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200">latency</span>;
      case 'error':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-50 text-red-700 border border-red-200">http_error</span>;
      case 'drop':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-200">socket_drop</span>;
      case 'hang':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200">hang</span>;
      case 'rate_limit':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-50 text-cyan-700 border border-cyan-200">rate_limit</span>;
      case 'drip':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">drip</span>;
      case 'malformed':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-pink-50 text-pink-700 border border-pink-200">malformed</span>;
      case 'redirect_loop':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-orange-50 text-orange-700 border border-orange-200">redirect_loop</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-100 text-zinc-600">{behavior}</span>;
    }
  };

  return (
    <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 space-y-4 font-mono shadow-sm">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/80">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold text-zinc-900 font-sans">Request Telemetry</h3>
          <span className="text-[11px] text-zinc-500 font-mono">
            ({logs.length})
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Filter probes..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 text-[11px] rounded-lg pl-8 pr-2.5 py-1 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 text-zinc-600 hover:text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onClearLogs}
            className="p-1.5 text-zinc-400 hover:text-red-600 bg-zinc-50 border border-zinc-200 rounded-lg transition-colors"
            title="Clear"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log Feed Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-8 text-center text-zinc-500 text-xs space-y-1">
          <p className="font-semibold text-zinc-700">No telemetry recorded yet.</p>
          <p className="text-[11px] text-zinc-400 font-sans">
            Send a request using the in-browser playground or cURL to capture real-time logs.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100 text-[11px]">
            {filteredLogs.map((log) => {
              const dateStr = new Date(log.timestamp).toLocaleTimeString();
              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="p-3 hover:bg-zinc-50 cursor-pointer transition-colors flex items-center justify-between gap-2"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className="text-[10px] text-zinc-400 w-14 shrink-0 font-mono">{dateStr}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200 shrink-0">
                      {log.method}
                    </span>
                    <span className="text-zinc-700 truncate max-w-xs text-[11px] font-mono">{log.path}</span>
                  </div>

                  <div className="flex items-center space-x-2.5 shrink-0">
                    {getBehaviorBadge(log.behaviorApplied)}

                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      log.httpStatusReturned >= 200 && log.httpStatusReturned < 300
                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                        : log.httpStatusReturned === 0
                        ? 'text-purple-700 bg-purple-50 border border-purple-200'
                        : 'text-red-700 bg-red-50 border border-red-200'
                    }`}>
                      {log.httpStatusReturned || 'DROP'}
                    </span>

                    <span className="text-zinc-500 text-[10px] w-12 text-right font-mono">
                      {log.durationMs}ms
                    </span>

                    <Eye className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-700" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full p-5 space-y-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h4 className="font-bold text-sm text-zinc-900 font-sans">Log Event Detail</h4>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200/80 text-[11px]">
              <div className="flex justify-between"><span className="text-zinc-500">ID:</span><span className="text-zinc-800 font-mono">{selectedLog.id}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Timestamp:</span><span className="text-zinc-800">{new Date(selectedLog.timestamp).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Method:</span><span className="text-zinc-900 font-bold">{selectedLog.method}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Path:</span><span className="text-zinc-800">{selectedLog.path}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Client IP:</span><span className="text-zinc-800">{selectedLog.clientIp}</span></div>
              <div className="flex justify-between items-center"><span className="text-zinc-500">Injected Behavior:</span><span>{getBehaviorBadge(selectedLog.behaviorApplied)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Returned Status:</span><span className="text-zinc-900 font-bold">{selectedLog.httpStatusReturned}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Duration:</span><span className="text-zinc-800">{selectedLog.durationMs}ms</span></div>
              {selectedLog.errorMessage && (
                <div className="pt-2 border-t border-zinc-200 text-red-600">
                  <span className="text-zinc-500">Details: </span>{selectedLog.errorMessage}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedLog(null)}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-lg transition-colors font-sans"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
