import { useState } from 'react';
import { Zap, MessageSquare, Building2, Loader2, CheckCircle2, AlertCircle, Terminal } from 'lucide-react';

const PRESETS = [
  {
    id: 'urgent',
    label: 'Urgent Multi-Item',
    icon: Zap,
    iconColor: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20',
    text: "Salam! Need 500 matte business cards with gold foil for CEO, plus two 6x3 flex banners for our booth opening tomorrow afternoon. Name is Tariq, phone 0300-1234567. Make it urgent please!",
  },
  {
    id: 'vague',
    label: 'Messy / Vague',
    icon: MessageSquare,
    iconColor: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20',
    text: "Hey bro send me flyers 1000 pcs for restaurant launch. Call me.",
  },
  {
    id: 'corporate',
    label: 'Corporate Bulk',
    icon: Building2,
    iconColor: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20',
    text: "Official PO: 250 laminated staff badges with lanyards and 5 acrylic table stands. Contact: Sarah from Systems HR, sarah@company.com.",
  },
];

export default function IntakeTerminal({ onSubmit, loading, error, successId }) {
  const [input, setInput] = useState('');

  const handlePreset = (text) => setInput(text);

  const handleSubmit = () => {
    if (!input.trim() || loading) return;
    onSubmit(input);
  };

  const charCount = input.length;
  const overLimit = charCount > 4000;

  return (
    <div className="flex flex-col p-6 gap-5">
      {/* Panel title */}
      <div className="flex items-center gap-2">
        <Terminal size={16} className="text-slate-400" />
        <span className="text-sm font-semibold text-slate-300">Intake Terminal</span>
        <span className="ml-auto text-xs text-slate-600">
          Accepts English, Roman Urdu, mixed
        </span>
      </div>

      {/* Quick-fill presets */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Demo Presets</p>
        {PRESETS.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => handlePreset(p.text)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all duration-150 ${p.bg}`}
            >
              <Icon size={14} className={p.iconColor} />
              <div>
                <p className="text-xs font-semibold text-slate-200">{p.label}</p>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{p.text.slice(0, 60)}…</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Adjustable Text area */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
            Raw Customer Message
          </p>
          <span className={`text-[11px] tabular-nums ${overLimit ? 'text-rose-400' : 'text-slate-600'}`}>
            {charCount} / 4000
          </span>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a WhatsApp message, email, or voice-to-text dump here…"
          rows={6}
          className="w-full resize-y rounded-xl bg-surface-2 border border-slate-700 
                     focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40
                     text-sm text-slate-200 placeholder-slate-600 p-4 font-mono
                     outline-none transition-all duration-200 min-h-[130px] max-h-[480px]"
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <AlertCircle size={15} className="text-rose-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-rose-300">{error}</p>
        </div>
      )}

      {/* Success flash */}
      {successId && !error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 size={15} className="text-emerald-400" />
          <p className="text-xs text-emerald-300 font-medium">
            {successId} created — check the stream →
          </p>
        </div>
      )}

      {/* Sticky Gemma Submit Button */}
      <div className="sticky bottom-0 bg-surface/95 backdrop-blur-md pt-3 pb-2 z-10 border-t border-slate-800/60 -mx-6 px-6 space-y-2">
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || loading || overLimit}
          className="btn-primary justify-center w-full py-3 text-base shadow-lg shadow-indigo-600/20"
        >
          {loading ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              Processing with Gemma…
            </>
          ) : (
            <>
              <Zap size={17} />
              Process Order with Gemma
            </>
          )}
        </button>

        {loading && (
          <p className="text-center text-xs text-slate-500 animate-pulse">
            Calling Gemma 4 · up to 30s · please wait…
          </p>
        )}
      </div>
    </div>
  );
}
