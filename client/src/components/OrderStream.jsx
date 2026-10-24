import { LayoutList } from 'lucide-react';
import OrderCard from './OrderCard.jsx';

export default function OrderStream({ orders, onStatusChange }) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-slate-600">
        <LayoutList size={40} className="opacity-30" />
        <div className="text-center">
          <p className="font-semibold">No orders yet</p>
          <p className="text-sm mt-1">Submit a message from the terminal to see live results</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <LayoutList size={16} className="text-slate-400" />
        <span className="text-sm font-semibold text-slate-300">Live Order Stream</span>
        <span className="ml-auto badge bg-indigo-500/20 text-indigo-400">
          {orders.length} {orders.length === 1 ? 'ticket' : 'tickets'}
        </span>
      </div>

      {orders.map((order) => (
        <OrderCard key={order.orderId} order={order} onStatusChange={onStatusChange} />
      ))}
    </div>
  );
}
