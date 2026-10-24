import { useState } from 'react';
import {
  Zap, MessageSquare, Building2, Loader2, CheckCircle2,
  AlertCircle, Terminal, MessageCircle, Send, Sparkles
} from 'lucide-react';

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

const WA_SIMULATIONS = [
  {
    name: 'Bilal Ahmed',
    from: '+92 321 5551234',
    text: 'Salam bhai, need 1000 glossy brochures 150gsm tri-fold, urgent delivery for expo by tomorrow. Call Bilal 0321-5551234.',
  },
  {
    name: 'Ayesha Khan',
    from: '+92 300 8889999',
    text: 'Hi! Printing quotation needed for 300 transparent vinyl stickers 3x3 inch, and 5 roll-up banners 2.5x6 ft for our brand launch. Thanks, Ayesha.',
  },
];

export default function IntakeTerminal({
  onSubmit,
  onSimulateWhatsApp,
  loading,
  simulating,
  error,
  successId,
}) {
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('whatsapp'); // 'whatsapp' | 'manual'

  const handlePreset = (text) => setInput(text);

  const handleSubmit = () => {
    if (!input.trim() || loading) return;
    onSubmit(input);
  };

  const charCount = input.length;
  const overLimit = charCount > 4000;

  return (
    <div className="flex flex-col h-full p-6 gap-5">
      {/* Panel title & mode switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-300">Intake Terminal</span>
        </div>

        <div className="flex items-center p-0.5 rounded-lg bg-surface-2 border border-slate-800 text-[11px]">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-600/30 text-emerald-300 font-semibold border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageCircle size={11} />
            Auto-WhatsApp
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              activeTab === 'manual'
                ? 'bg-indigo-600/30 text-indigo-300 font-semibold border border-indigo-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Manual Paste
          </button>
        </div>
      </div>

      {/* Auto-WhatsApp Webhook Simulator (Hands-Free) */}
      {activeTab === 'whatsapp' ? (
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <Sparkles size={15} />
              <span className="text-xs font-bold uppercase tracking-wider">Hands-Free Inbound Webhook</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              When customers send WhatsApp messages, Meta hits <code className="text-emerald-300 bg-surface-2 px-1 py-0.5 rounded">/api/webhook/whatsapp</code>.
              Gemma automatically processes the text, records the order, and triggers instant alerts without any manual copy-pasting.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Simulate Inbound Customer Message
            </p>
            <div className="flex flex-col gap-2.5">
              {WA_SIMULATIONS.map((sim, i) => (
                <button
                  key={i}
                  disabled={simulating || loading}
                  onClick={() => onSimulateWhatsApp(sim)}
                  className="flex flex-col text-left p-3.5 rounded-xl bg-surface-2 border border-slate-700/80 hover:border-emerald-500/50 hover:bg-surface-3 transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <MessageCircle size={12} />
                      {sim.name} ({sim.from})
                    </span>
                    <span className="text-[10px] text-slate-500 group-hover:text-emerald-300 transition-colors flex items-center gap-1">
                      <Send size={10} /> Send via Webhook
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 italic">"{sim.text}"</p>
                </button>
              ))}
            </div>
          </div>

          {simulating && (
            <div className="flex items-center justify-center gap-2.5 py-4 px-3 rounded-xl bg-surface-2 border border-emerald-500/30 text-emerald-400 text-xs animate-pulse">
              <Loader2 size={16} className="animate-spin" />
              Incoming WhatsApp Webhook Received — Gemma is extracting order details hands-free...
            </div>
          )}
        </div>
      ) : (
        /* Manual Text Paste Terminal */
        <div className="flex flex-col gap-4">
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

          <div className="flex flex-col flex-1 gap-2">
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
              placeholder="Paste a WhatsApp message, email, or voice dump here…"
              rows={8}
              className="flex-1 w-full resize-none rounded-xl bg-surface-2 border border-slate-700 
                         focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40
                         text-sm text-slate-200 placeholder-slate-600 p-4 font-mono
                         outline-none transition-all duration-200 min-h-[160px]"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!input.trim() || loading || overLimit}
            className="btn-primary justify-center w-full py-3 text-base"
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
        </div>
      )}

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
    </div>
  );
}
