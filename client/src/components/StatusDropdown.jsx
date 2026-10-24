import { ChevronDown } from 'lucide-react';

const STATUSES = ['Pending Intake', 'In Production', 'Ready for Dispatch'];

const STATUS_COLORS = {
  'Pending Intake': 'text-slate-300',
  'In Production': 'text-amber-300',
  'Ready for Dispatch': 'text-emerald-300',
};

export default function StatusDropdown({ current, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-600 font-medium uppercase tracking-wider">
        Status
      </span>
      <div className="relative inline-block">
        <select
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className={`appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-semibold
                      bg-surface-2 border border-slate-700 outline-none cursor-pointer
                      hover:border-slate-500 transition-colors
                      ${STATUS_COLORS[current] ?? 'text-slate-300'}`}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s} className="bg-surface-2 text-slate-200">
              {s}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
        />
      </div>
    </div>
  );
}
