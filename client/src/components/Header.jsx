import { Printer, Cpu } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-surface/90 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4">
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
              Automated Order Intake Pipeline
            </p>
          </div>
        </div>

        {/* Model badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <Cpu size={13} className="text-emerald-400" />
          <span className="text-[11px] font-semibold text-emerald-400 tracking-wide">
            Powered by Google Gemma 4 (26B-A4B)
          </span>
        </div>
      </div>
    </header>
  );
}
