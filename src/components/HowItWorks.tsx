import React from 'react';
import { Link2, Sliders, Code2 } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      number: '1',
      icon: <Link2 className="w-5 h-5 text-amber-600" />,
      title: 'Get a URL',
      description: 'Instant 24-hour sandbox or custom slug endpoint.'
    },
    {
      number: '2',
      icon: <Sliders className="w-5 h-5 text-amber-600" />,
      title: 'Configure chaos',
      description: 'Dial in latency, 5xx errors, TCP drops, or rate limits.'
    },
    {
      number: '3',
      icon: <Code2 className="w-5 h-5 text-amber-600" />,
      title: 'Point your code at it',
      description: 'Run your HTTP client tests and inspect retry & fallback logic.'
    }
  ];

  return (
    <section className="py-8 border-b border-zinc-200/60 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div
              key={s.number}
              className="flex items-start space-x-3.5 p-4 rounded-xl border border-zinc-200/70 bg-zinc-50/50 shadow-2xs"
            >
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0">
                {s.icon}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-amber-600">STEP {s.number}</span>
                  <h3 className="text-sm font-semibold text-zinc-900">{s.title}</h3>
                </div>
                <p className="text-xs text-zinc-600 leading-snug">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
