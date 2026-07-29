import React from 'react';
import { BookOpen, X, ShieldCheck, Unplug, Clock, AlertTriangle, Cpu, Zap, FileCode2 } from 'lucide-react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-mono text-xs">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl max-w-2xl w-full p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-zinc-300" />
            <h3 className="font-semibold text-xs text-white">Hiccup Guide & Architecture</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-4 overflow-y-auto pr-1 text-zinc-300 leading-relaxed text-[11px]">
          {/* Section 1 */}
          <div className="space-y-1.5 bg-black p-3 rounded border border-zinc-900">
            <div className="flex items-center space-x-2 font-semibold text-white">
              <Cpu className="w-3.5 h-3.5 text-zinc-400" />
              <span>Real Server Network Fault Execution</span>
            </div>
            <p className="text-zinc-400">
              Unlike client-side mock generators, Hiccup runs on an active full-stack server capable of true TCP socket manipulation (`res.socket.destroy()`), unbuffered chunked streaming, and connection holding up to 120 seconds.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h4 className="font-semibold text-xs text-zinc-200">Supported Fault Behaviors</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-black p-2.5 rounded border border-zinc-900">
                <div className="flex items-center space-x-1.5 font-semibold text-zinc-200 mb-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Latency & Jitter</span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Delays response by a configured millisecond range with randomized jitter variance.
                </p>
              </div>

              <div className="bg-black p-2.5 rounded border border-zinc-900">
                <div className="flex items-center space-x-1.5 font-semibold text-zinc-200 mb-1">
                  <Unplug className="w-3 h-3 text-purple-400" />
                  <span>Abrupt TCP Reset (ECONNRESET)</span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Destroys underlying socket mid-flight without standard HTTP response framing.
                </p>
              </div>

              <div className="bg-black p-2.5 rounded border border-zinc-900">
                <div className="flex items-center space-x-1.5 font-semibold text-zinc-200 mb-1">
                  <Clock className="w-3 h-3 text-blue-400" />
                  <span>Silent Connection Hang</span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Holds connection open without transmitting bytes to verify client socket timeouts.
                </p>
              </div>

              <div className="bg-black p-2.5 rounded border border-zinc-900">
                <div className="flex items-center space-x-1.5 font-semibold text-zinc-200 mb-1">
                  <AlertTriangle className="w-3 h-3 text-cyan-400" />
                  <span>Rate Limiting (429)</span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Enforces rate limits returning HTTP 429 along with standard `Retry-After` headers.
                </p>
              </div>

              <div className="bg-black p-2.5 rounded border border-zinc-900">
                <div className="flex items-center space-x-1.5 font-semibold text-zinc-200 mb-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  <span>Slow Drip Byte Streaming</span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Transmits tiny byte chunks slowly with custom delay intervals to test chunked streaming parsers and read timeouts.
                </p>
              </div>

              <div className="bg-black p-2.5 rounded border border-zinc-900">
                <div className="flex items-center space-x-1.5 font-semibold text-zinc-200 mb-1">
                  <FileCode2 className="w-3 h-3 text-pink-400" />
                  <span>Malformed JSON Syntactic Error</span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Returns HTTP 200 with corrupted, truncated JSON syntax to verify client JSON deserialization error handling.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-1.5 bg-black p-3 rounded border border-zinc-900">
            <div className="flex items-center space-x-2 font-semibold text-white">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>Client Resilience Checklist</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 text-[10px]">
              <li><strong>Exponential Backoff + Jitter:</strong> Prevent thundering herd problems during service recovery.</li>
              <li><strong>Explicit Socket Timeouts:</strong> Set bounded read & connect timeouts (e.g. 5s cap).</li>
              <li><strong>Idempotency Keys:</strong> Pass idempotency identifiers when retrying non-idempotent operations.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2.5 border-t border-zinc-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium rounded transition-colors text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

