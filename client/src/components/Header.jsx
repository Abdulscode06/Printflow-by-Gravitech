import { Printer, Cpu, MessageCircle, Bell, BellRing } from 'lucide-react';

export default function Header({ notifPermission, onRequestNotif }) {
  const isGranted = notifPermission === 'granted';

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-surface/90 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4 flex-wrap gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30">
            <Printer size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none tracking-tight">
              PrintFlow <span className="text-indigo-400">AI</span>
            </h1>
            <p className="text-[11px] text-slate-500 leading-none mt-0.5">
              Hands-Free WhatsApp Intake Pipeline
            </p>
          </div>
        </div>

        {/* Right Badges & Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* WhatsApp Webhook Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <MessageCircle size={13} className="text-emerald-400" />
            <span className="text-[11px] font-semibold text-emerald-400 tracking-wide">
              WhatsApp Webhook: Live
            </span>
          </div>

          {/* Desktop Push Alert Toggle */}
          <button
            onClick={onRequestNotif}
            title={isGranted ? 'Desktop alerts enabled' : 'Click to enable desktop sound & push alerts'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium transition-all ${
              isGranted
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                : 'bg-surface-2 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {isGranted ? <BellRing size={12} className="text-indigo-400" /> : <Bell size={12} />}
            {isGranted ? 'Alerts Active' : 'Enable Alerts'}
          </button>

          {/* Model badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-slate-700/60">
            <Cpu size={13} className="text-indigo-400" />
            <span className="text-[11px] font-medium text-slate-300 tracking-wide">
              Google Gemma 4
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
