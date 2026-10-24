import { useState } from 'react';
import {
  User, Phone, Mail, AlertTriangle, ChevronDown, ChevronUp,
  Copy, Check, Clock, Package, Zap, MessageCircle,
} from 'lucide-react';
import { buildWhatsAppMessage } from '../utils/whatsapp.js';
import StatusDropdown from './StatusDropdown.jsx';

const STATUS_STYLES = {
  'Pending Intake': 'bg-slate-700/60 text-slate-300 border-slate-600',
  'In Production': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Ready for Dispatch': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

const CARD_PALETTES = [
  { border: 'border-indigo-500/30', accent: 'text-indigo-400', badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30', glow: 'from-indigo-950/15' },
  { border: 'border-emerald-500/30', accent: 'text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', glow: 'from-emerald-950/15' },
  { border: 'border-cyan-500/30', accent: 'text-cyan-400', badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', glow: 'from-cyan-950/15' },
  { border: 'border-purple-500/30', accent: 'text-purple-400', badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30', glow: 'from-purple-950/15' },
  { border: 'border-amber-500/30', accent: 'text-amber-400', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30', glow: 'from-amber-950/15' },
  { border: 'border-rose-500/30', accent: 'text-rose-400', badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30', glow: 'from-rose-950/15' },
  { border: 'border-sky-500/30', accent: 'text-sky-400', badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30', glow: 'from-sky-950/15' },
];

function getCardTheme(orderId) {
  const num = parseInt(orderId?.replace(/\D/g, '') || '0', 10);
  return CARD_PALETTES[num % CARD_PALETTES.length];
}

export default function OrderCard({ order, onStatusChange }) {
  const [jsonOpen, setJsonOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasMissing = order.missingDetails?.length > 0;
  const theme = getCardTheme(order.orderId);

  const handleCopyWA = () => {
    const msg = buildWhatsAppMessage(order);
    navigator.clipboard.writeText(msg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formattedDate = new Date(order.timestamp).toLocaleString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div
      className={`card p-5 space-y-4 bg-gradient-to-br ${theme.glow} via-surface-1 to-surface-1 transition-all duration-200 ${
        order.isUrgent
          ? 'border-red-500/50 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]'
          : `${theme.border} hover:border-slate-700`
      }`}
    >
      {/* ── Header row ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className={`badge font-mono text-xs font-bold border ${theme.badge}`}>
            {order.orderId}
          </span>

          {order.source === 'whatsapp' && (
            <span className="badge bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <MessageCircle size={10} />
              WhatsApp Auto-Intake
            </span>
          )}

          {order.isUrgent && (
            <span className="badge bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse-fast">
              <Zap size={10} />
              URGENT
            </span>
          )}

          <span className={`badge border ${STATUS_STYLES[order.status] ?? STATUS_STYLES['Pending Intake']}`}>
            {order.status}
          </span>

          <span className="badge bg-surface-3 text-slate-500 border border-slate-700/50 font-mono text-[10px]">
            {order.model?.split('/').pop() ?? 'gemma'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock size={12} />
          {formattedDate}
        </div>
      </div>

      {/* ── Status dropdown ── */}
      <StatusDropdown
        current={order.status}
        onChange={(s) => onStatusChange(order.orderId, s)}
      />

      {/* ── Customer info ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <InfoPill icon={User} label={order.customerName || '—'} />
        <InfoPill icon={Phone} label={order.phone || <span className="text-slate-600 italic">no phone</span>} />
        <InfoPill icon={Mail} label={order.email || <span className="text-slate-600 italic">no email</span>} />
      </div>

      {/* ── Items table ── */}
      {order.items?.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-surface-2">
                <Th>Product</Th>
                <Th>Qty</Th>
                <Th>Material</Th>
                <Th>Dimensions</Th>
                <Th>Notes</Th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr
                  key={i}
                  className="border-b border-slate-800/50 last:border-0 hover:bg-surface-2/50 transition-colors"
                >
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <Package size={11} className={`${theme.accent} flex-shrink-0`} />
                      <span className="font-medium text-slate-200 capitalize">{item.productType}</span>
                    </div>
                  </Td>
                  <Td>
                    <span className="font-mono font-bold text-white">{item.quantity?.toLocaleString()}</span>
                  </Td>
                  <Td>{item.material || <Nil />}</Td>
                  <Td>{item.dimensions || <Nil />}</Td>
                  <Td>{item.notes || <Nil />}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Missing details alert ── */}
      {hasMissing && (
        <div className="p-4 rounded-xl bg-amber-500/8 border border-amber-500/25 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
            <p className="text-xs font-semibold text-amber-300">
              AI Alert — Missing Information ({order.missingDetails.length})
            </p>
          </div>

          <ul className="space-y-1">
            {order.missingDetails.map((d, i) => (
              <li key={i} className="text-xs text-amber-200/80 flex items-start gap-1.5">
                <span className="text-amber-500 mt-0.5">•</span>
                {d}
              </li>
            ))}
          </ul>

          <button
            onClick={handleCopyWA}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                       bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25
                       text-xs font-semibold text-amber-300 transition-all duration-150 active:scale-95"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy WhatsApp Clarification (EN + Roman Urdu)'}
          </button>
        </div>
      )}

      {/* ── JSON inspector accordion ── */}
      <div className="border-t border-slate-800 pt-3">
        <button
          onClick={() => setJsonOpen((v) => !v)}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {jsonOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          Raw JSON Payload
        </button>

        {jsonOpen && (
          <pre className="mt-3 p-4 rounded-xl bg-surface text-[11px] font-mono text-emerald-400 
                          overflow-x-auto border border-slate-800 leading-relaxed">
            {JSON.stringify(
              { orderId: order.orderId, model: order.model, ...order },
              null,
              2,
            )}
          </pre>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function InfoPill({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 border border-slate-800">
      <Icon size={12} className="text-slate-500 flex-shrink-0" />
      <span className="text-xs text-slate-300 truncate">{label}</span>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children }) {
  return <td className="px-3 py-2.5 text-slate-400 max-w-[160px]">{children}</td>;
}

function Nil() {
  return <span className="text-slate-700 italic">—</span>;
}
